"""Inline diagnostics insights — fast 0.8b with deterministic fallback (always returns text)."""
from __future__ import annotations

import logging
import os

import httpx
from django.conf import settings

from apps.agents.ollama_warmup import ollama_keep_alive_value

logger = logging.getLogger(__name__)

_INSIGHT_SYSTEM = """You are MANAS on the SANSAD Diagnostics page (Tata Steel ATAL).
Write a concise operational insight in 3–5 plain sentences for a plant engineer.

Rules:
- Cite specific sensor names, percentages, stages, and fault labels from the context.
- Explain what it means, causal link, and what to verify next.
- No greetings, no markdown headers, no mention of chat or sessions.
- Always produce at least three sentences of substance.
"""


def _ollama_chat(model: str, system: str, user: str, *, max_tokens: int = 360) -> str:
    if os.environ.get("OLLAMA_MOCK") == "1":
        return ""

    native = f"{settings.OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "keep_alive": ollama_keep_alive_value(),
        "options": {"num_predict": max_tokens, "temperature": 0.2},
    }
    with httpx.Client(timeout=90) as client:
        resp = client.post(native, json=payload, headers={"Content-Type": "application/json"})
        resp.raise_for_status()
        msg = resp.json().get("message") or {}
        content = (msg.get("content") or "").strip()
        if _is_usable_insight(content):
            return content

    openai_url = f"{settings.OLLAMA_BASE_URL}/v1/chat/completions"
    openai_payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.2,
        "stream": False,
    }
    with httpx.Client(timeout=90) as client:
        resp = client.post(openai_url, json=openai_payload, headers={"Content-Type": "application/json"})
        resp.raise_for_status()
        choice = (resp.json().get("choices") or [{}])[0]
        return ((choice.get("message") or {}).get("content") or "").strip()


def _is_usable_insight(text: str) -> bool:
    if len(text) < 40:
        return False
    head = text[:120].lower()
    if head.startswith("thinking") or "thinking process" in head:
        return False
    return True


def _sensor_lines(sensors: list[dict]) -> str:
    if not sensors:
        return "[no live sensor readings]"
    return "\n".join(
        f"- {s.get('label', 'sensor')}: {s.get('value', '—')} ({s.get('status', 'nominal')})"
        for s in sensors[:3]
    )


def _template_rca_insight(
    *,
    asset_name: str,
    probable_fault: str,
    root_causes: list[dict],
    sensors: list[dict],
) -> str:
    top = root_causes[0]
    others = ", ".join(rc.get("factor", "") for rc in root_causes[1:3] if rc.get("factor"))
    sensor_bit = ""
    if sensors:
        parts = [f"{s.get('label')}={s.get('value')}" for s in sensors[:3]]
        sensor_bit = f" Key live readings: {', '.join(parts)}."
    chain = f" Secondary factors: {others}." if others else ""
    return (
        f"On {asset_name}, {top.get('factor')} is the primary contributor ({int(float(top.get('weight', 0)) * 100)}%) "
        f"to the current diagnosis: {probable_fault}.{sensor_bit}{chain} "
        "Prioritise verifying envelope breaches on the top sensor, then confirm whether vibration or pressure trends align with the fault class before scheduling intervention."
    )


def _template_defect_insight(
    *,
    asset_name: str,
    stage: str,
    probable_fault: str,
    process_defects: list[dict],
) -> str:
    links = "; ".join(
        f"{d.get('stage')}: {d.get('defect')}"
        for d in process_defects[:3]
    )
    return (
        f"Cross-stage analysis for {asset_name} ({stage}) links upstream process deviations to the present condition ({probable_fault}). "
        f"Flagged correlations: {links}. "
        "These upstream envelope breaches can propagate through the production sequence — monitor the highest-influence upstream stage first and confirm whether local sensors on the target asset are reacting to the same disturbance."
    )


def _generate_insight(user_blob: str, template_fallback: str) -> dict:
    insight = ""
    router = "deterministic"

    for model in (settings.OLLAMA_SMALL_MODEL,):
        try:
            text = _ollama_chat(model, _INSIGHT_SYSTEM, user_blob)
            if _is_usable_insight(text):
                insight = text
                router = model
                break
        except Exception as exc:
            logger.warning("insight model %s failed: %s", model, exc)

    if not insight:
        insight = template_fallback

    return {
        "insight_angle": "Operational insight",
        "insight": insight,
        "router": router,
    }


def generate_rca_overview_insight(
    *,
    asset_name: str,
    factory: str,
    stage: str,
    probable_fault: str,
    health: int,
    rul_days: int | None,
    root_causes: list[dict],
    sensors: list[dict] | None = None,
    early_warning: str | None = None,
) -> dict:
    if not root_causes:
        raise ValueError("no root causes to analyse")

    sensors = sensors or []
    lines = "\n".join(
        f"- {rc.get('factor')} ({rc.get('weight', 0):.0%}): {rc.get('evidence', '')}"
        for rc in root_causes[:3]
    )
    user_blob = (
        f"Asset: {asset_name} ({factory}, {stage})\n"
        f"Health: {health}% | RUL: {rul_days if rul_days is not None else 'unknown'} days\n"
        f"Diagnosis: {probable_fault}\n"
        f"Early warning: {early_warning or 'none'}\n"
        f"Root causes:\n{lines}\n"
        f"Live sensors:\n{_sensor_lines(sensors)}\n"
        "Synthesise how these root causes chain together and what the operator should verify first."
    )
    template = _template_rca_insight(
        asset_name=asset_name,
        probable_fault=probable_fault,
        root_causes=root_causes,
        sensors=sensors,
    )
    return _generate_insight(user_blob, template)


def generate_defect_correlation_insight(
    *,
    asset_name: str,
    factory: str,
    stage: str,
    probable_fault: str,
    process_defects: list[dict],
    sensors: list[dict] | None = None,
    cascade_risk: str | None = None,
) -> dict:
    if not process_defects:
        raise ValueError("no process defects to analyse")

    sensors = sensors or []
    lines = "\n".join(
        f"- {d.get('stage')}: {d.get('defect')} | {d.get('link', '')}"
        for d in process_defects[:4]
    )
    user_blob = (
        f"Asset: {asset_name} ({factory}, {stage})\n"
        f"Diagnosis: {probable_fault}\n"
        f"Cascade risk: {cascade_risk or 'unknown'}\n"
        f"Process defect links:\n{lines}\n"
        f"Local sensors:\n{_sensor_lines(sensors)}\n"
        "Explain how upstream process parameters relate to this asset's condition."
    )
    template = _template_defect_insight(
        asset_name=asset_name,
        stage=stage,
        probable_fault=probable_fault,
        process_defects=process_defects,
    )
    return _generate_insight(user_blob, template)

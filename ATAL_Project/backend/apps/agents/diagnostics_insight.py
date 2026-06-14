"""Inline diagnostics insights — 0.8b routes context, MANAS 9B answers in-page (no chat session)."""
from __future__ import annotations

import json
import logging

import httpx
from django.conf import settings

from apps.agents.graph.agents import _call_small_model

logger = logging.getLogger(__name__)

_ROUTER_SYSTEM = """You are SANSAD's diagnostics router (qwen3.5:0.8b) in the ATAL LangGraph stack.
Given live asset diagnostics, craft a focused brief for MANAS (9B) to answer inline on the Diagnostics page.

Output ONLY valid JSON:
{
  "insight_angle": "One sentence — what the operator needs to understand",
  "manas_prompt": "2–4 sentences instructing MANAS what to explain. Include asset, fault/defects, sensors, and desired analysis. No preamble."
}

Rules:
- Steel-plant scope only (SRF, HHPD, FS, HAGCC, APT, TCMS, CGP, HPAK).
- Do NOT answer yourself — only route to MANAS.
"""

_MANAS_INLINE_SYSTEM = """You are MANAS, Tata Steel ATAL maintenance engineer.
The operator is on the SANSAD Diagnostics page — answer inline in 3–6 sentences.

Rules:
- Be specific: cite sensors, stages, percentages, and causal links from the context.
- Actionable: what it means, what to verify, urgency if any.
- No markdown headers, no chat greetings, no mention of sessions or chat IDs.
- If the asset is in normal operation, say so briefly and note what to keep monitoring.
"""


def _parse_router_json(raw: str) -> dict | None:
    if "{" not in raw:
        return None
    start = raw.find("{")
    end = raw.rfind("}") + 1
    try:
        parsed = json.loads(raw[start:end])
    except json.JSONDecodeError:
        return None
    prompt = (parsed.get("manas_prompt") or "").strip()
    if not prompt:
        return None
    return {
        "insight_angle": (parsed.get("insight_angle") or "Operational insight").strip(),
        "manas_prompt": prompt,
    }


def _call_manas_inline(user_prompt: str) -> str:
    url = f"{settings.OLLAMA_BASE_URL}/v1/chat/completions"
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": _MANAS_INLINE_SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 450,
        "temperature": 0.15,
        "stream": False,
        "think": False,
        "keep_alive": settings.OLLAMA_KEEP_ALIVE,
    }
    with httpx.Client(timeout=120) as client:
        resp = client.post(url, json=payload, headers={"Content-Type": "application/json"})
        resp.raise_for_status()
    return (resp.json()["choices"][0]["message"].get("content") or "").strip()


def _route_then_answer(context_blob: str, fallback_prompt: str) -> dict:
    routed = None
    try:
        raw = _call_small_model(_ROUTER_SYSTEM, context_blob)
        routed = _parse_router_json(raw)
    except Exception as exc:
        logger.warning("diagnostics router failed: %s", exc)

    manas_prompt = routed["manas_prompt"] if routed else fallback_prompt
    angle = routed["insight_angle"] if routed else "Operational insight"

    try:
        insight = _call_manas_inline(manas_prompt)
    except Exception as exc:
        logger.error("inline manas insight failed: %s", exc)
        raise

    return {
        "insight_angle": angle,
        "insight": insight,
        "router": "qwen3.5:0.8b → qwen3.5:9b",
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
    early_warning: str | None = None,
) -> dict:
    if not root_causes:
        raise ValueError("no root causes to analyse")

    lines = "\n".join(
        f"- {rc.get('factor')} ({rc.get('weight', 0):.0%}): {rc.get('evidence', '')}"
        for rc in root_causes[:3]
    )
    context = (
        f"Task: Root Cause Analysis overview for {asset_name}\n"
        f"Factory: {factory}\nStage: {stage}\nHealth: {health}%\n"
        f"RUL: {rul_days or 'unknown'} days\n"
        f"Diagnosis: {probable_fault or '[none]'}\n"
        f"Early warning: {early_warning or '[none]'}\n"
        f"Top causal factors:\n{lines}\n"
        "MANAS should synthesise how these factors chain together and what to investigate first."
    )
    fallback = (
        f"Explain how these root causes relate to the diagnosis on {asset_name}: {lines}. "
        f"Current fault: {probable_fault}. Prioritise verification steps."
    )
    return _route_then_answer(context, fallback)


def generate_defect_correlation_insight(
    *,
    asset_name: str,
    factory: str,
    stage: str,
    probable_fault: str,
    process_defects: list[dict],
    cascade_risk: str | None = None,
) -> dict:
    if not process_defects:
        raise ValueError("no process defects to analyse")

    lines = "\n".join(
        f"- {d.get('stage')}: {d.get('defect')} ({d.get('link', '')})"
        for d in process_defects[:4]
    )
    context = (
        f"Task: Process defect cross-stage correlation for {asset_name}\n"
        f"Factory: {factory}\nTarget stage: {stage}\n"
        f"Current diagnosis: {probable_fault or '[none]'}\n"
        f"Cascade risk: {cascade_risk or 'unknown'}\n"
        f"Linked upstream/local defects:\n{lines}\n"
        "MANAS should explain how upstream process parameters may contribute to the target asset condition."
    )
    fallback = (
        f"Explain how these cross-stage process defects relate to {asset_name} ({stage}): {lines}. "
        "Describe the production-chain causal link and monitoring priority."
    )
    return _route_then_answer(context, fallback)

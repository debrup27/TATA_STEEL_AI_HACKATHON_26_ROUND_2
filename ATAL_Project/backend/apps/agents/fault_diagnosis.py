"""Human-readable probable fault diagnosis via qwen 0.8b + template fallback."""
from __future__ import annotations

import hashlib
import logging
import os
import time

import httpx
from django.conf import settings

from apps.agents.ollama_warmup import ollama_keep_alive_value

logger = logging.getLogger(__name__)

_DIAGNOSIS_SYSTEM = """You write probable fault diagnosis lines for the SANSAD diagnostics panel at Tata Steel.

Output exactly 1–2 plain sentences for a plant engineer. Explain the likely fault mechanism and WHY,
citing specific sensor readings, ML fault class, health/RUL, and top root-cause factors from the context.

Rules:
- Human-readable prose only — no bullets, markdown, labels, or greetings.
- Name sensors with their values and status when available.
- If simulation/abnormality is active, mention it as the trigger.
- Stay under 280 characters when possible.
- Do not mention MANAS, chat, or AI.
"""

_CACHE_TTL_SEC = 90
_cache: dict[str, tuple[str, float, str]] = {}


def _is_usable_diagnosis(text: str) -> bool:
    if len(text) < 24 or len(text) > 400:
        return False
    lower = text.lower()
    if lower.startswith("thinking") or "thinking process" in lower[:80]:
        return False
    junk = (
        "asset_id",
        "provide consolidated",
        "json",
        "sensor_readings",
        "ml_predictions",
        "maintenance_history",
        "you are",
        "as an ai",
    )
    if any(j in lower for j in junk):
        return False
    return True


def _ollama_small(system: str, user: str, *, max_tokens: int = 120) -> str:
    if os.environ.get("OLLAMA_MOCK") == "1":
        return ""

    payload = {
        "model": settings.OLLAMA_SMALL_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "keep_alive": ollama_keep_alive_value(),
        "options": {"num_predict": max_tokens, "temperature": 0.15},
    }
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(url, json=payload, headers={"Content-Type": "application/json"})
            resp.raise_for_status()
        content = (resp.json().get("message") or {}).get("content") or ""
        content = content.strip().strip('"')
        if _is_usable_diagnosis(content):
            return content
    except Exception as exc:
        logger.warning("fault_diagnosis ollama failed: %s", exc)

    try:
        openai_url = f"{settings.OLLAMA_BASE_URL}/v1/chat/completions"
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                openai_url,
                json={
                    "model": settings.OLLAMA_SMALL_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.15,
                    "stream": False,
                },
            )
            resp.raise_for_status()
        out = ((resp.json().get("choices") or [{}])[0].get("message") or {}).get("content", "").strip()
        return out if _is_usable_diagnosis(out) else ""
    except Exception as exc:
        logger.warning("fault_diagnosis ollama openai failed: %s", exc)
        return ""


def _sensor_blob(sensors: list[dict]) -> str:
    if not sensors:
        return "none"
    return "; ".join(
        f"{s.get('label', 'sensor')}={s.get('value', '—')} ({s.get('status', 'nominal')})"
        for s in sensors[:3]
    )


def _rca_blob(root_causes: list[dict]) -> str:
    if not root_causes:
        return "none"
    return "; ".join(
        f"{rc.get('factor')} ({int(float(rc.get('weight', 0)) * 100)}%)"
        for rc in root_causes[:3]
    )


def _cache_fingerprint(
    *,
    asset_id: str,
    fault_class: int,
    health: int,
    confidence: float,
    sensors: list[dict],
    root_causes: list[dict],
    fault_label_hint: str,
) -> str:
    raw = f"{asset_id}|{fault_class}|{health}|{confidence:.2f}|{_sensor_blob(sensors)}|{_rca_blob(root_causes)}|{fault_label_hint[:80]}"
    return hashlib.sha256(raw.encode()).hexdigest()[:20]


def _template_narrative(
    *,
    asset_name: str,
    fault_label_hint: str,
    health: int,
    confidence: float,
    sensors: list[dict],
    root_causes: list[dict],
    rul_days: int | None,
    anomaly_score,
    simulation_fault_type: str | None,
) -> str:
    lead = fault_label_hint.rstrip(".")
    if simulation_fault_type:
        lead = f"{lead} (abnormality generator: {simulation_fault_type})"

    sensor_bit = ""
    if sensors:
        s = sensors[0]
        sensor_bit = f" Live {s.get('label')} reads {s.get('value')} ({s.get('status')})"

    rca_bit = ""
    if root_causes:
        rc = root_causes[0]
        rca_bit = f", with {rc.get('factor')} the strongest contributor ({int(float(rc.get('weight', 0)) * 100)}%)"

    rul_bit = f" RUL ~{rul_days} days." if rul_days else ""
    conf_bit = f" Model confidence {int(confidence * 100)}%." if confidence > 0 else ""
    anomaly_bit = ""
    if anomaly_score is not None:
        try:
            anomaly_bit = f" Anomaly score {float(anomaly_score):.2f}."
        except (TypeError, ValueError):
            pass

    return (
        f"{asset_name} shows {lead.lower()} with health at {health}%"
        f"{sensor_bit}{rca_bit}.{conf_bit}{anomaly_bit}{rul_bit}"
    ).replace("..", ".").strip()


def generate_probable_fault_narrative(
    *,
    asset_id: str,
    asset_name: str,
    stage: str,
    fault_label_hint: str,
    fault_class: int,
    confidence: float,
    health: int,
    rul_days: int | None,
    anomaly_score,
    sensors: list[dict],
    root_causes: list[dict],
    early_warning: str | None = None,
    simulation_fault_type: str | None = None,
    pred_output: dict | None = None,
) -> str:
    pred_output = pred_output or {}
    fingerprint = _cache_fingerprint(
        asset_id=asset_id,
        fault_class=fault_class,
        health=health,
        confidence=confidence,
        sensors=sensors,
        root_causes=root_causes,
        fault_label_hint=fault_label_hint,
    )
    now = time.time()
    cached = _cache.get(asset_id)
    if cached and cached[0] == fingerprint and (now - cached[1]) < _CACHE_TTL_SEC:
        return cached[2]

    template = _template_narrative(
        asset_name=asset_name,
        fault_label_hint=fault_label_hint,
        health=health,
        confidence=confidence,
        sensors=sensors,
        root_causes=root_causes,
        rul_days=rul_days,
        anomaly_score=anomaly_score,
        simulation_fault_type=simulation_fault_type,
    )

    pred_lines = []
    for key in ("fault_classification", "fault_confidence", "anomaly_score", "rul_hours", "classifier_health"):
        if pred_output.get(key) is not None:
            pred_lines.append(f"{key}={pred_output[key]}")

    user_blob = (
        f"Asset: {asset_name} ({stage})\n"
        f"ML fault class index: {fault_class}\n"
        f"Fault label hint: {fault_label_hint}\n"
        f"Health: {health}% | Confidence: {confidence:.0%} | RUL: {rul_days if rul_days is not None else 'unknown'} days\n"
        f"Anomaly score: {anomaly_score if anomaly_score is not None else 'n/a'}\n"
        f"Simulation: {simulation_fault_type or 'none'}\n"
        f"Early warning: {early_warning or 'none'}\n"
        f"Predictions: {', '.join(pred_lines) or 'n/a'}\n"
        f"Sensors: {_sensor_blob(sensors)}\n"
        f"Root causes: {_rca_blob(root_causes)}\n"
        "Write the probable fault diagnosis."
    )

    text = _ollama_small(_DIAGNOSIS_SYSTEM, user_blob)
    if not _is_usable_diagnosis(text):
        text = template

    text = text.replace("\n", " ").strip()
    if len(text) > 320:
        text = text[:317].rsplit(" ", 1)[0] + "…"

    _cache[asset_id] = (fingerprint, now, text)
    return text

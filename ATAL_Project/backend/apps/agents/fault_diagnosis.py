"""Human-readable probable fault diagnosis via qwen 0.8b + template fallback."""
from __future__ import annotations

import hashlib
import logging
import os
import re
import time

logger = logging.getLogger(__name__)

_DIAGNOSIS_SYSTEM = """Summarize the likely equipment fault for a steel-plant engineer in 1–2 plain sentences.
Use sensor readings, fault class, health/RUL, and root causes from the data provided.

Plain prose only — no bullets, markdown, labels, task headers, or mention of prompts/AI/chat.
"""

_DIAGNOSIS_META_MARKERS = (
    "write a probable",
    "write the probable",
    "write probable",
    "task:",
    "**task",
    "sansad diagnostics",
    "atal's diagnostic",
    "atal diagnostic",
    "probable fault diagnosis line",
    "diagnostics panel",
    "output exactly",
    "rules:",
    "you write",
    "cite specific",
    "verify the prompt",
)

_CACHE_TTL_SEC = 90
_cache: dict[str, tuple[str, float, str]] = {}


def _strip_markdown_noise(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"\*+", "", cleaned)
    cleaned = re.sub(r"#+\s*", "", cleaned)
    cleaned = re.sub(r"^\s*[-•]\s+", "", cleaned)
    cleaned = re.sub(r"^\s*task:\s*", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _is_usable_diagnosis(text: str) -> bool:
    cleaned = _strip_markdown_noise(text)
    if len(cleaned) < 24 or len(cleaned) > 400:
        return False
    lower = cleaned.lower()
    if lower.startswith("thinking") or "thinking process" in lower[:80]:
        return False
    if any(marker in lower for marker in _DIAGNOSIS_META_MARKERS):
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
        "unable to perform",
        "without specific asset data",
        "asset uuid",
    )
    if any(j in lower for j in junk):
        return False
    from apps.agents.llm.client import is_chain_of_thought_leak

    if is_chain_of_thought_leak(cleaned):
        return False
    return True


def _ollama_small(system: str, user: str, *, max_tokens: int = 120) -> str:
    if os.environ.get("OLLAMA_MOCK") == "1":
        return ""

    from apps.agents.llm.client import (
        _invoke_ollama_chat_completions_parts,
        _retry_invoke,
        is_chain_of_thought_leak,
    )
    from apps.agents.ollama_warmup import OLLAMA_SMALL_LOCK

    def _call() -> str:
        content, reasoning = _invoke_ollama_chat_completions_parts(
            model_size="small",
            system=system,
            user=user,
            max_tokens=max_tokens,
            temperature=0.12,
            think=False,
        )
        for candidate in (content, reasoning):
            cleaned = _strip_markdown_noise(candidate).strip().strip('"')
            if cleaned and _is_usable_diagnosis(cleaned) and not is_chain_of_thought_leak(cleaned):
                return cleaned
        return ""

    with OLLAMA_SMALL_LOCK:
        return _retry_invoke(_call)


def _sensor_blob(sensors: list[dict]) -> str:
    if not sensors:
        return "none"
    return "; ".join(
        f"{s.get('label', 'sensor')}={s.get('value', '—')} ({s.get('status', 'nominal')})"
        for s in sensors[:3]
    )


def _rca_blob(root_causes: list[dict]) -> str:
    from apps.assets.rca_sanitize import is_junk_rca_factor

    if not root_causes:
        return "none"
    valid = [rc for rc in root_causes[:3] if not is_junk_rca_factor(str(rc.get("factor", "")))]
    if not valid:
        return "none"
    return "; ".join(
        f"{rc.get('factor')} ({int(float(rc.get('weight', 0)) * 100)}%)"
        for rc in valid
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
        from apps.assets.rca_sanitize import is_junk_rca_factor

        valid = [rc for rc in root_causes if not is_junk_rca_factor(str(rc.get("factor", "")))]
        if valid:
            rc = valid[0]
            rca_bit = (
                f", with {rc.get('factor')} the strongest contributor "
                f"({int(float(rc.get('weight', 0)) * 100)}%)"
            )

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
        cached_text = cached[2]
        if _is_usable_diagnosis(cached_text):
            return cached_text

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
        "Summarize the likely fault mechanism in 1-2 sentences for the engineer."
    )

    text = _ollama_small(_DIAGNOSIS_SYSTEM, user_blob)
    if not _is_usable_diagnosis(text):
        text = template

    text = _strip_markdown_noise(text)
    if len(text) > 320:
        text = text[:317].rsplit(" ", 1)[0] + "…"

    if not _is_usable_diagnosis(text):
        text = template

    _cache[asset_id] = (fingerprint, now, text)
    return text

"""
Worker agents — qwen3.5:0.8b parallel sub-tasks.
Each agent is a pure text transform: receives already-gathered data, produces
a text artifact. No DB writes. No tool calls. Just focused, cheap reasoning.
"""
from __future__ import annotations
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _call_small_model(system: str, user: str) -> str:
    """Call qwen3.5:0.8b via Ollama native /api/chat (qwen3.5 breaks on /v1 for 0.8b)."""
    import time
    import httpx
    from django.conf import settings
    from apps.agents.ollama_warmup import ollama_keep_alive_value

    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": settings.OLLAMA_SMALL_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "think": False,
        "keep_alive": ollama_keep_alive_value(),
        "options": {"num_predict": 512, "temperature": 0.2},
    }
    last_exc: Exception | None = None
    for attempt in range(1, 4):
        try:
            with httpx.Client(timeout=90) as client:
                resp = client.post(url, json=payload)
                resp.raise_for_status()
            content = (resp.json().get("message") or {}).get("content") or ""
            return content.strip()
        except Exception as exc:
            last_exc = exc
            logger.warning(
                "small_model_error attempt=%d model=%s error=%s",
                attempt,
                settings.OLLAMA_SMALL_MODEL,
                exc,
            )
            if attempt < 3:
                time.sleep(3 * attempt)
    assert last_exc is not None
    logger.error("small_model_error model=%s error=%s", settings.OLLAMA_SMALL_MODEL, last_exc)
    raise last_exc


def _run_worker(worker_name: str, user_prompt: str, system_prompt: str) -> str:
    return _call_small_model(system_prompt, user_prompt)


# ---------------------------------------------------------------------------
# Worker agents
# ---------------------------------------------------------------------------

def work_order_drafter(asset_name: str, diagnosis: str, rca: str,
                       recommendations: list, rag_context: str = "") -> str:
    """Draft a structured work-order description from diagnosis + RCA."""
    system = (
        "You are a maintenance planning engineer. Draft a concise, actionable work-order "
        "description in 150–200 words. Include: objective, step-by-step actions, safety "
        "precautions (LOTO if relevant), and estimated duration. Be specific — no generic advice."
    )
    user = (
        f"Asset: {asset_name}\n"
        f"Diagnosis: {diagnosis}\n"
        f"Root Cause: {rca}\n"
        f"Recommendations: {recommendations}\n"
        f"Reference context (use if relevant):\n{rag_context[:600]}"
    )
    return _run_worker("WorkOrderDrafter", user, system)


def sensor_window_summarizer(asset_name: str, sensor_summary: dict) -> str:
    """Produce a plain-language summary of the 24h sensor window."""
    system = (
        "You are a process engineer. Summarise the 24-hour sensor statistics in 3–5 sentences. "
        "Flag any sensor that exceeds typical operating ranges. Keep it factual, no recommendations."
    )
    import json
    user = (
        f"Asset: {asset_name}\n"
        f"24h sensor stats:\n{json.dumps(sensor_summary, indent=2)[:1000]}"
    )
    return _run_worker("SensorWindowSummarizer", user, system)


def alarm_triager(asset_name: str, active_alerts: list) -> str:
    """Triage active alarms by severity and likely causal order."""
    system = (
        "You are an industrial alarm analyst. Triage the following active alarms: "
        "list each alarm, its severity, and the recommended priority order for investigation. "
        "Keep the response under 150 words."
    )
    import json
    user = (
        f"Asset: {asset_name}\n"
        f"Active alarms:\n{json.dumps(active_alerts, indent=2)[:800]}"
    )
    return _run_worker("AlarmTriager", user, system)


def citation_formatter(citations: list, rag_context: str = "") -> str:
    """Format raw citation dicts into a clean, numbered citation list."""
    system = (
        "You are a technical documentation specialist. Format the following citation data "
        "into a clean numbered list: '<N>. <Doc title> §<Section> — <one-sentence summary of what it specifies>'. "
        "Only include citations that are directly relevant to the diagnosis. Max 5 citations."
    )
    import json
    user = (
        f"Citations:\n{json.dumps(citations, indent=2)[:600]}\n\n"
        f"Supporting context:\n{rag_context[:400]}"
    )
    return _run_worker("CitationFormatter", user, system)


def spare_strategist(asset_name: str, spare_strategy: str, spares_data: dict) -> str:
    """Draft a specific spare-parts procurement recommendation."""
    system = (
        "You are a spare-parts procurement specialist. Given the strategy and current stock data, "
        "output a concrete procurement recommendation in 2–3 sentences: what to order, how many, "
        "and when to order it. Be specific about part names and quantities."
    )
    import json
    user = (
        f"Asset: {asset_name}\n"
        f"AI spare strategy: {spare_strategy}\n"
        f"Current stock:\n{json.dumps(spares_data, indent=2)[:400]}"
    )
    return _run_worker("SpareStrategist", user, system)


# Task dispatch table — supervisor references these by name
WORKER_DISPATCH = {
    "WorkOrderDrafter": work_order_drafter,
    "SensorWindowSummarizer": sensor_window_summarizer,
    "AlarmTriager": alarm_triager,
    "CitationFormatter": citation_formatter,
    "SpareStrategist": spare_strategist,
}

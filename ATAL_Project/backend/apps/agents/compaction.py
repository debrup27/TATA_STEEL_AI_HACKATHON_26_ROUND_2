"""
MANAS chat history compaction — triggered when conversation history exceeds 80% of the
model's context window.

Model window: qwen3.5:9b = 32768 tokens.
Threshold:    0.80 × 32768 ≈ 26214 tokens.
Estimation:   ~3.5 chars / token (conservative for English + technical content).
Strategy:     Keep the last _KEEP_RECENT messages intact; summarise older ones via LLM;
              delete originals; insert a single system message with the summary.
"""
from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

_MODEL_WINDOW_TOKENS: int = 32768
_COMPACTION_THRESHOLD: float = 0.80
_CHARS_PER_TOKEN: float = 3.5
_KEEP_RECENT: int = 6        # always preserve the last N messages
_SUMMARY_MAX_TOKENS: int = 600


def _estimate_tokens(text: str) -> int:
    return max(1, int(len(text) / _CHARS_PER_TOKEN))


def history_token_count(messages: list[dict]) -> int:
    return sum(_estimate_tokens(m.get("content") or "") for m in messages)


def should_compact(messages: list[dict]) -> bool:
    threshold = int(_MODEL_WINDOW_TOKENS * _COMPACTION_THRESHOLD)
    return history_token_count(messages) > threshold


def compact_history(session_id: str) -> int:
    """
    Summarise old messages, persist summary as a system ChatMessage, delete originals.
    Notifies the frontend via stream_registry (compacting / compacted events).
    Returns the number of messages replaced.
    """
    from apps.agents.stream_registry import send_to_stream
    from apps.agents.models import ChatMessage
    from apps.agents.ollama_warmup import ollama_keep_alive_value
    from django.conf import settings

    messages = list(
        ChatMessage.objects.filter(session_id=session_id)
        .order_by("timestamp")
        .values("id", "role", "content")
    )

    if len(messages) <= _KEEP_RECENT:
        return 0

    to_compact = messages[: -_KEEP_RECENT]
    if not to_compact:
        return 0

    send_to_stream(session_id, {"type": "compacting"})

    history_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in to_compact
    )

    _SUMMARY_SYSTEM = (
        "You are summarising a steel-plant maintenance engineer conversation. "
        "Produce a concise factual summary (under 400 words) covering: "
        "the equipment discussed, faults/issues identified, diagnoses made, "
        "recommended actions, and any key numeric values (sensor readings, "
        "ISO thresholds, RUL values, alarm setpoints). "
        "Preserve all asset names (SRF/HHPD/FS/HAGCC/APT/TCMS/CGP/HPAK), "
        "ISO standard references, and maintenance decisions. "
        "Do NOT include pleasantries or meta-commentary."
    )

    try:
        resp = httpx.post(
            f"{settings.OLLAMA_BASE_URL}/api/chat",
            json={
                "model": settings.OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": _SUMMARY_SYSTEM},
                    {"role": "user", "content": history_text},
                ],
                "stream": False,
                "think": False,
                "keep_alive": ollama_keep_alive_value(),
                "options": {"num_predict": _SUMMARY_MAX_TOKENS, "temperature": 0.1},
            },
            timeout=120,
        )
        resp.raise_for_status()
        summary = resp.json().get("message", {}).get("content", "").strip()
    except Exception as exc:
        logger.warning("compaction_summary_failed session=%s error=%s", session_id, exc)
        summary = (
            f"[{len(to_compact)} earlier messages summarised — content covered "
            "maintenance issues, sensor readings, and recommendations for the assets in scope.]"
        )

    ids_to_delete = [m["id"] for m in to_compact]
    ChatMessage.objects.filter(id__in=ids_to_delete).delete()

    ChatMessage.objects.create(
        session_id=session_id,
        role="system",
        content=f"[Context compaction — {len(to_compact)} messages summarised]\n\n{summary}",
        model_used=settings.OLLAMA_MODEL,
    )

    count = len(to_compact)
    logger.info("compacted session=%s messages=%d", session_id, count)

    send_to_stream(session_id, {"type": "compacted", "compacted_count": count})

    return count

"""
MANAS chat history compaction.

Auto: runs once a session reaches 7 messages (keeps the last 6).
Manual (/compact): allowed from 3 messages (keeps the last 2).

Strategy: summarise older messages via LLM; delete originals; insert one system summary row.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_KEEP_RECENT: int = 6           # auto-compaction: preserve the last N messages
_MIN_MESSAGES_AUTO: int = 7     # auto-compact once total messages reach this count
_KEEP_RECENT_FORCE: int = 2       # manual /compact: preserve the last N messages
_MIN_MESSAGES_FORCE: int = 3      # manual /compact works from this many messages
_SUMMARY_MAX_TOKENS: int = 600


def should_compact(messages: list[dict]) -> bool:
    """Auto-compact when the session has at least 7 messages."""
    return len(messages) >= _MIN_MESSAGES_AUTO


def compact_history(session_id: str, *, force: bool = False) -> int:
    """
    Summarise old messages, persist summary as a system ChatMessage, delete originals.
    Notifies the frontend via stream_registry (compacting / compacted events).
    Returns the number of messages replaced.
    """
    from apps.agents.stream_registry import send_to_stream
    from apps.agents.models import ChatMessage
    from django.conf import settings

    messages = list(
        ChatMessage.objects.filter(session_id=session_id)
        .order_by("timestamp")
        .values("id", "role", "content")
    )

    keep_recent = _KEEP_RECENT_FORCE if force else _KEEP_RECENT
    min_messages = _MIN_MESSAGES_FORCE if force else _MIN_MESSAGES_AUTO

    if len(messages) < min_messages:
        if force:
            send_to_stream(
                session_id,
                {"type": "compacted", "compacted_count": 0, "skipped": True},
            )
        return 0

    if len(messages) <= keep_recent:
        if force:
            send_to_stream(
                session_id,
                {"type": "compacted", "compacted_count": 0, "skipped": True},
            )
        return 0

    to_compact = messages[: -keep_recent]
    if not to_compact:
        return 0

    send_to_stream(session_id, {"type": "compacting"})

    history_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in to_compact
    )

    _SUMMARY_SYSTEM = (
        "You are summarising a maintenance engineer conversation for the ATAL's Diagnostic. "
        "Produce a concise factual summary (under 400 words) covering: "
        "the equipment discussed, faults/issues identified, diagnoses made, "
        "recommended actions, and any key numeric values (sensor readings, "
        "ISO thresholds, RUL values, alarm setpoints). "
        "Preserve all asset names (SRF/HHPD/FS/HAGCC/APT/TCMS/CGP/HPAK), "
        "ISO standard references, and maintenance decisions. "
        "Do NOT include pleasantries or meta-commentary."
    )

    try:
        from apps.agents.llm.client import invoke_raw

        summary = invoke_raw(
            model_size="large",
            system=_SUMMARY_SYSTEM,
            user=history_text,
            max_tokens=_SUMMARY_MAX_TOKENS,
            temperature=0.1,
            skip_input_guard=True,
            source="system",
        )
    except Exception as exc:
        logger.warning("compaction_summary_failed session=%s error=%s", session_id, exc)
        try:
            summary = invoke_raw(
                model_size="large",
                system=_SUMMARY_SYSTEM,
                user=history_text,
                max_tokens=_SUMMARY_MAX_TOKENS,
                temperature=0.1,
                skip_input_guard=True,
                source="system",
            )
        except Exception as retry_exc:
            logger.warning(
                "compaction_summary_retry_failed session=%s error=%s",
                session_id,
                retry_exc,
            )
            summary = (
                f"[Compaction — {len(to_compact)} earlier messages preserved verbatim]\n\n"
                f"{history_text[:12000]}"
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

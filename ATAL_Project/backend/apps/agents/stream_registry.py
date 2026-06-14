"""
In-process stream registry: background thread → asyncio.Queue → WS consumer.

Eliminates the Redis channel-layer round-trip for token streaming, which was
causing `redis.exceptions.TimeoutError` when the LLM took longer than the
Redis socket read-timeout between messages.

Usage:
  Consumer:  register_stream(session_id, loop) → asyncio.Queue
             unregister_stream(session_id) on disconnect
  Thread:    send_to_stream(session_id, event) → bool (True = delivered)
"""
from __future__ import annotations

import asyncio
import threading
from typing import Optional

_registry: dict[str, tuple[asyncio.Queue, asyncio.AbstractEventLoop]] = {}
_pending: dict[str, list[dict]] = {}
_lock = threading.Lock()
_MAX_PENDING = 500


def register_stream(
    session_id: str,
    loop: asyncio.AbstractEventLoop,
) -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue()
    with _lock:
        _registry[session_id] = (q, loop)
        backlog = _pending.pop(session_id, [])
    for event in backlog:
        try:
            loop.call_soon_threadsafe(q.put_nowait, event)
        except Exception:
            pass
    return q


def unregister_stream(session_id: str) -> None:
    with _lock:
        entry = _registry.pop(session_id, None)
        _pending.pop(session_id, None)
    if entry:
        # Unblock any pending drain by pushing a sentinel
        q, loop = entry
        try:
            loop.call_soon_threadsafe(q.put_nowait, None)
        except Exception:
            pass


def send_to_stream(session_id: str, event: dict) -> bool:
    """Thread-safe. Returns True if queued (live consumer or short-term buffer)."""
    with _lock:
        entry = _registry.get(session_id)
        if entry is None:
            buf = _pending.setdefault(session_id, [])
            buf.append(event)
            if len(buf) > _MAX_PENDING:
                del buf[: len(buf) - _MAX_PENDING]
            return True
        q, loop = entry
    try:
        loop.call_soon_threadsafe(q.put_nowait, event)
        return True
    except Exception:
        return False

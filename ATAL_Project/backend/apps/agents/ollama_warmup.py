"""
Pre-load Ollama LLMs and local RAG models so the first MANAS message is fast.
"""
from __future__ import annotations

import logging
import os

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


def ollama_keep_alive_value(keep_alive: str | None = None) -> str | int:
    """Ollama API: -1 must be JSON number, not the string \"-1\"."""
    raw = keep_alive if keep_alive is not None else settings.OLLAMA_KEEP_ALIVE
    if str(raw).strip() == "-1":
        return -1
    return raw


def _ollama_chat_warm(model: str, *, keep_alive: str | None = None) -> bool:
    if os.environ.get("OLLAMA_MOCK") == "1":
        return True

    keep = ollama_keep_alive_value(keep_alive)
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "ok"}],
        "stream": False,
        "think": False,
        "keep_alive": keep,
        "options": {"num_predict": 1, "temperature": 0},
    }
    try:
        with httpx.Client(timeout=httpx.Timeout(connect=30, read=300, write=30, pool=5)) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
        logger.info("ollama_warmup ok model=%s keep_alive=%s", model, keep)
        return True
    except Exception as exc:
        logger.warning("ollama_warmup failed model=%s error=%s", model, exc)
        return False


def warm_ollama_models(*, keep_alive: str | None = None) -> dict[str, bool]:
    """Load supervisor + worker models into Ollama memory."""
    results = {
        settings.OLLAMA_MODEL: _ollama_chat_warm(settings.OLLAMA_MODEL, keep_alive=keep_alive),
        settings.OLLAMA_SMALL_MODEL: _ollama_chat_warm(
            settings.OLLAMA_SMALL_MODEL, keep_alive=keep_alive
        ),
    }
    return results


def warm_rag_models() -> dict[str, bool]:
    """Load BGE embedder + reranker (first chat RAG path)."""
    if os.environ.get("EMBEDDING_MOCK") == "1":
        return {"embedder": True, "reranker": True}

    results: dict[str, bool] = {}
    try:
        from apps.rag.embedder import embed_chunk

        embed_chunk("atal warmup probe")
        results["embedder"] = True
        logger.info("rag_warmup ok embedder")
    except Exception as exc:
        results["embedder"] = False
        logger.warning("rag_warmup embedder failed: %s", exc)

    try:
        from apps.rag.reranker import rerank

        rerank(
            "warmup",
            [{"properties": {"content": "atal warmup probe"}}],
            top_k=1,
        )
        results["reranker"] = True
        logger.info("rag_warmup ok reranker")
    except Exception as exc:
        results["reranker"] = False
        logger.warning("rag_warmup reranker failed: %s", exc)

    return results


def warm_inference_stack(*, rag: bool = True) -> dict:
    """Full MANAS inference stack warmup (Ollama + optional RAG models)."""
    out: dict = {"ollama": warm_ollama_models()}
    if rag:
        out["rag"] = warm_rag_models()
    return out

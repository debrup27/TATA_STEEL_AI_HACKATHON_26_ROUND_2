"""
Pre-load Ollama LLMs and local RAG models so the first MANAS message is fast.
"""
from __future__ import annotations

import logging
import os
import threading

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

# Process-wide lock serializing ALL qwen 0.8b small-model calls (chat workers + prompt optimizer).
# Parallel 0.8b requests while the 9b is resident can crash Ollama — both the chat pipeline and the
# optimizer run in the same uvicorn process, so a threading.Lock fully serializes them.
OLLAMA_SMALL_LOCK = threading.Lock()


def ollama_keep_alive_value(keep_alive: str | None = None) -> str | int:
    """Ollama API: -1 must be JSON number, not the string \"-1\"."""
    raw = keep_alive if keep_alive is not None else settings.OLLAMA_KEEP_ALIVE
    if str(raw).strip() == "-1":
        return -1
    return raw


# A cold 9B Q4 load can be slow under GPU contention at fresh `docker compose up`
# (BGE models + warmup sidecar competing). Generous read timeout + internal retries so warm
# reliably succeeds on start instead of tripping a timeout.
_WARM_READ_TIMEOUT_S = int(os.environ.get("OLLAMA_WARM_READ_TIMEOUT", "600"))
_WARM_ATTEMPTS = int(os.environ.get("OLLAMA_WARM_ATTEMPTS", "3"))


def _ollama_chat_warm(model: str, *, keep_alive: str | None = None) -> bool:
    """Force-load a model into memory via the lightweight /api/generate load path.

    Empty prompt + num_predict 0 is Ollama's documented "just load the model" call — cheaper and
    more reliable than a full chat for warmup. Retries with a generous read timeout so a slow cold
    load under GPU pressure still completes rather than timing out.
    """
    if os.environ.get("OLLAMA_MOCK") == "1":
        return True

    keep = ollama_keep_alive_value(keep_alive)
    url = f"{settings.OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": model,
        "prompt": "",
        "stream": False,
        "keep_alive": keep,
        "options": {"num_predict": 0, "temperature": 0},
    }
    last_exc: Exception | None = None
    for attempt in range(1, _WARM_ATTEMPTS + 1):
        try:
            with httpx.Client(
                timeout=httpx.Timeout(connect=30, read=_WARM_READ_TIMEOUT_S, write=30, pool=5)
            ) as client:
                resp = client.post(url, json=payload)
                resp.raise_for_status()
            logger.info("ollama_warmup ok model=%s keep_alive=%s attempt=%d", model, keep, attempt)
            return True
        except Exception as exc:
            last_exc = exc
            logger.warning(
                "ollama_warmup attempt=%d/%d failed model=%s error=%s",
                attempt, _WARM_ATTEMPTS, model, exc,
            )
    logger.error("ollama_warmup exhausted model=%s error=%s", model, last_exc)
    return False


def warm_ollama_models(*, keep_alive: str | None = None) -> dict[str, bool]:
    """Load worker (small, fast) then supervisor (large) models into Ollama memory."""
    results = {
        settings.OLLAMA_SMALL_MODEL: _ollama_chat_warm(
            settings.OLLAMA_SMALL_MODEL, keep_alive=keep_alive
        ),
        settings.OLLAMA_MODEL: _ollama_chat_warm(settings.OLLAMA_MODEL, keep_alive=keep_alive),
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

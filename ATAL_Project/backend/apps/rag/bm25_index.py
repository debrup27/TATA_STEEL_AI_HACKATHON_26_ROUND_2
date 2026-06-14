"""
In-memory BM25 sparse index per ChromaDB collection.
Refreshed after document ingest; merged with vector search via RRF.
"""
import logging
import threading
from typing import Dict, List, Optional, Tuple

from rank_bm25 import BM25Okapi

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_indices: Dict[str, Tuple[BM25Okapi, List[str], List[str]]] = {}


def _tokenize(text: str) -> List[str]:
    return [t for t in text.lower().split() if len(t) > 1]


def refresh_collection(collection_name: str) -> None:
    """Rebuild BM25 index from all documents in a ChromaDB collection."""
    from apps.rag.chroma_client import get_chroma_client

    try:
        client = get_chroma_client()
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        n = collection.count()
        if n == 0:
            with _lock:
                _indices.pop(collection_name, None)
            return

        data = collection.get(include=["documents"])
        docs = data.get("documents") or []
        ids = data.get("ids") or []
        if not docs:
            return

        tokenized = [_tokenize(d or "") for d in docs]
        with _lock:
            _indices[collection_name] = (BM25Okapi(tokenized), ids, docs)
        logger.info("bm25_refresh collection=%s docs=%d", collection_name, len(docs))
    except Exception as exc:
        logger.warning("bm25_refresh_failed collection=%s error=%s", collection_name, exc)


def bm25_search(collection_name: str, query: str, limit: int = 20) -> List[Tuple[str, str, float]]:
    """Return [(doc_id, document_text, bm25_score), ...] sorted by score desc."""
    with _lock:
        entry = _indices.get(collection_name)
    if entry is None:
        refresh_collection(collection_name)
        with _lock:
            entry = _indices.get(collection_name)
    if not entry:
        return []

    bm25, ids, docs = entry
    scores = bm25.get_scores(_tokenize(query))
    ranked = sorted(zip(ids, docs, scores), key=lambda x: x[2], reverse=True)
    return [(i, d, float(s)) for i, d, s in ranked[:limit] if s > 0]


def reciprocal_rank_fusion(
    vector_results: List[dict],
    bm25_results: List[Tuple[str, str, float]],
    limit: int = 10,
    k: int = 60,
) -> List[dict]:
    """Merge vector and BM25 hits using RRF."""
    scores: Dict[str, float] = {}
    payloads: Dict[str, dict] = {}

    for rank, item in enumerate(vector_results):
        content = item.get("properties", {}).get("content", "")
        key = content[:120] if content else f"vec_{rank}"
        scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank + 1)
        payloads[key] = item

    for rank, (_doc_id, text, _bm25) in enumerate(bm25_results):
        key = text[:120] if text else f"bm25_{rank}"
        scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank + 1)
        if key not in payloads:
            payloads[key] = {
                "properties": {"content": text},
                "distance": 1.0,
                "rrf_source": "bm25",
            }

    merged = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    out = []
    for key, rrf_score in merged[:limit]:
        doc = dict(payloads[key])
        doc["rrf_score"] = rrf_score
        out.append(doc)
    return out

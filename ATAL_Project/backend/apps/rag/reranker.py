"""
BGE Reranker v2-M3 — cross-encoder reranking for hybrid search results.
Runs locally, no external calls (REQ-SECURITY-005).
Model: BAAI/bge-reranker-v2-m3 (stronger than base; same FlagEmbedding API).
Override path via BGE_RERANKER_MODEL_PATH env var for Docker volume mount.
"""
import os
from typing import List, Dict, Any

_reranker = None

_MODEL_PATH = os.environ.get("BGE_RERANKER_MODEL_PATH", "BAAI/bge-reranker-v2-m3")


def _get_reranker():
    global _reranker
    if _reranker is None:
        from FlagEmbedding import FlagReranker
        _reranker = FlagReranker(_MODEL_PATH, use_fp16=True)
    return _reranker


def rerank(query: str, documents: List[Dict[str, Any]], content_key: str = "content", top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Rerank documents using BGE Reranker Base cross-encoder.
    Returns top_k docs sorted by reranker score descending.
    """
    if not documents:
        return []

    reranker = _get_reranker()
    pairs = [[query, doc.get("properties", {}).get(content_key, "")] for doc in documents]
    scores = reranker.compute_score(pairs, normalize=True)

    if not isinstance(scores, list):
        scores = [scores]

    scored = sorted(zip(scores, documents), key=lambda x: x[0], reverse=True)
    results = []
    for score, doc in scored[:top_k]:
        doc = dict(doc)
        doc["reranker_score"] = float(score)
        results.append(doc)
    return results

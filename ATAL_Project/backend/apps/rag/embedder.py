"""
Local embedding service using BAAI/bge-m3 (1024-dim).
No external API calls — runs fully locally (REQ-SECURITY-005).
Results cached in Redis via hash(chunk_text).
"""
import hashlib
import json
from typing import List
from django.core.cache import cache

_model = None


def _get_model():
    global _model
    if _model is None:
        from FlagEmbedding import BGEM3FlagModel
        import os
        model_path = os.environ.get("BGE_M3_MODEL_PATH", "BAAI/bge-m3")
        _model = BGEM3FlagModel(model_path, use_fp16=True)
    return _model


def embed_chunk(text: str) -> List[float]:
    cache_key = f"emb_bge:{hashlib.sha256(text.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return json.loads(cached)

    model = _get_model()
    output = model.encode([text], return_dense=True, return_sparse=False, return_colbert_vecs=False)
    vector = output["dense_vecs"][0].tolist()
    cache.set(cache_key, json.dumps(vector), timeout=86400 * 30)
    return vector


def embed_chunks(texts: List[str]) -> List[List[float]]:
    cached = {}
    uncached_indices = []
    uncached_texts = []

    for i, text in enumerate(texts):
        cache_key = f"emb_bge:{hashlib.sha256(text.encode()).hexdigest()}"
        val = cache.get(cache_key)
        if val is not None:
            cached[i] = json.loads(val)
        else:
            uncached_indices.append(i)
            uncached_texts.append(text)

    results = [None] * len(texts)
    for i, vec in cached.items():
        results[i] = vec

    if uncached_texts:
        model = _get_model()
        output = model.encode(uncached_texts, return_dense=True, return_sparse=False, return_colbert_vecs=False)
        vectors = output["dense_vecs"].tolist()
        for orig_i, text, vec in zip(uncached_indices, uncached_texts, vectors):
            results[orig_i] = vec
            cache_key = f"emb_bge:{hashlib.sha256(text.encode()).hexdigest()}"
            cache.set(cache_key, json.dumps(vec), timeout=86400 * 30)

    return results

"""
Local embedding service using BAAI/bge-m3 (1024-dim) on GPU.
No external API calls — runs fully locally (REQ-SECURITY-005).
Results cached in Redis via hash(chunk_text).
"""
import hashlib
import json
import os
from typing import List
from django.core.cache import cache

_model = None


def _get_model():
    global _model
    if _model is None:
        from FlagEmbedding import BGEM3FlagModel
        model_path = os.environ.get("BGE_M3_MODEL_PATH", "BAAI/bge-m3")
        device = os.environ.get("EMBEDDING_DEVICE", "cuda")
        use_fp16 = device != "cpu"
        try:
            _model = BGEM3FlagModel(model_path, use_fp16=use_fp16, device=device)
        except Exception:
            if device != "cpu":
                _model = BGEM3FlagModel(model_path, use_fp16=False, device="cpu")
            else:
                raise
    return _model


def _mock_vector(text: str) -> List[float]:
    """Deterministic 1024-dim stub for EMBEDDING_MOCK=1 (tests only)."""
    import struct
    digest = hashlib.sha256(text.encode()).digest()
    out: List[float] = []
    while len(out) < 1024:
        for i in range(0, len(digest), 4):
            if len(out) >= 1024:
                break
            out.append((struct.unpack(">I", digest[i : i + 4])[0] / 2**32) * 2 - 1)
        digest = hashlib.sha256(digest).digest()
    return out


def embed_chunk(text: str) -> List[float]:
    if os.environ.get("EMBEDDING_MOCK") == "1":
        return _mock_vector(text)

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
    if os.environ.get("EMBEDDING_MOCK") == "1":
        return [_mock_vector(t) for t in texts]

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

    results: List = [None] * len(texts)
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

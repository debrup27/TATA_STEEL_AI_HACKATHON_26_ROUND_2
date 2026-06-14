"""
BGE Reranker v2-M3 — cross-encoder reranking for hybrid search results.
Runs locally on GPU via raw transformers AutoModel (avoids FlagEmbedding /
sentence-transformers API churn across versions).
No external calls (REQ-SECURITY-005).
Override path via BGE_RERANKER_MODEL_PATH env var for Docker volume mount.
"""
import os
from typing import List, Dict, Any

_model = None
_tokenizer = None
_device = None
_MODEL_PATH = os.environ.get("BGE_RERANKER_MODEL_PATH", "BAAI/bge-reranker-v2-m3")


def _load():
    global _model, _tokenizer, _device
    if _model is None:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        # Default cpu — keeps GPU VRAM free for Ollama.
        _device = os.environ.get("EMBEDDING_DEVICE", "cpu")
        from transformers import PreTrainedTokenizerFast
        _tokenizer = PreTrainedTokenizerFast(
            tokenizer_file=os.path.join(_MODEL_PATH, "tokenizer.json"),
            bos_token="<s>",
            eos_token="</s>",
            unk_token="<unk>",
            sep_token="</s>",
            pad_token="<pad>",
            cls_token="<s>",
            mask_token="<mask>",
            model_max_length=8192,
        )
        _model = AutoModelForSequenceClassification.from_pretrained(
            _MODEL_PATH, torch_dtype=torch.float16 if _device == "cuda" else torch.float32,
            low_cpu_mem_usage=True,
        )
        _model.to(_device)
        _model.eval()


def rerank(query: str, documents: List[Dict[str, Any]], content_key: str = "content", top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Rerank documents using BGE Reranker v2-M3 (raw transformers sequence classification).
    Returns top_k docs sorted by score descending.
    """
    if not documents:
        return []

    import torch
    _load()

    pairs = [[query, doc.get("properties", {}).get(content_key, "")] for doc in documents]
    inputs = _tokenizer(
        [p[0] for p in pairs],
        [p[1] for p in pairs],
        padding=True,
        truncation=True,
        max_length=512,
        return_tensors="pt",
    ).to(_device)

    with torch.no_grad():
        logits = _model(**inputs).logits.squeeze(-1)
        scores = torch.sigmoid(logits).cpu().tolist()

    if not isinstance(scores, list):
        scores = [scores]

    scored = sorted(zip(scores, documents), key=lambda x: float(x[0]), reverse=True)
    results = []
    for score, doc in scored[:top_k]:
        doc = dict(doc)
        doc["reranker_score"] = float(score)
        results.append(doc)
    return results

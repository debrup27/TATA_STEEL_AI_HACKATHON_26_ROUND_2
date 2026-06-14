"""
RAG retrieval functions:
- retrieve_sop(asset_type, query, procedure_phase)
- retrieve_iso_compliance(standard_code, asset_type, query)
- retrieve_asset_intelligence(asset_id, query)
- retrieve_safety_codes(asset_type, query)

Hybrid pipeline: BM25 + BGE-M3 vector → RRF merge → (reranker in chat path).
"""
from typing import Optional, List, Dict
from apps.rag.embedder import embed_chunk
from apps.rag.chroma_client import get_chroma_client
from apps.rag.bm25_index import bm25_search, reciprocal_rank_fusion


def _vector_search(
    collection_name: str,
    query: str,
    where: dict = None,
    limit: int = 10,
    asset_type_filter: Optional[str] = None,
    asset_id_filter: Optional[str] = None,
) -> List[Dict]:
    """Generic vector search against a ChromaDB collection."""
    try:
        client = get_chroma_client()
        query_vector = embed_chunk(query)
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        n = collection.count()
        if n == 0:
            return []

        fetch_limit = min(limit * 4 if (asset_type_filter or asset_id_filter) else limit, n)
        kwargs = {
            "query_embeddings": [query_vector],
            "n_results": fetch_limit,
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where

        results = collection.query(**kwargs)

        output = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            if asset_type_filter:
                scope = meta.get("asset_scope", "")
                if asset_type_filter not in scope:
                    continue
            if asset_id_filter:
                if meta.get("asset_id", "") != asset_id_filter:
                    continue
            output.append({"properties": {**meta, "content": doc}, "distance": dist})

        return output[:limit]
    except Exception:
        return []


def _hybrid_search(
    collection_name: str,
    query: str,
    where: dict = None,
    limit: int = 10,
    asset_type_filter: Optional[str] = None,
    asset_id_filter: Optional[str] = None,
) -> List[Dict]:
    """BM25 + vector search merged via reciprocal rank fusion."""
    vector_hits = _vector_search(
        collection_name, query, where=where, limit=limit * 2,
        asset_type_filter=asset_type_filter, asset_id_filter=asset_id_filter,
    )
    bm25_hits = bm25_search(collection_name, query, limit=limit * 2)
    if not bm25_hits:
        return vector_hits[:limit]
    if not vector_hits:
        return [
            {"properties": {"content": text, **({"title": ""})}, "distance": 1.0}
            for _, text, _ in bm25_hits[:limit]
        ]
    return reciprocal_rank_fusion(vector_hits, bm25_hits, limit=limit)


def retrieve_sop(asset_type: str, query: str, procedure_phase: Optional[str] = None) -> List[Dict]:
    where = None
    if procedure_phase:
        where = {"procedure_phase": {"$eq": procedure_phase}}
    return _hybrid_search("SOP", query, where=where, asset_type_filter=asset_type or None)


def retrieve_iso_compliance(
    standard_code: Optional[str] = None,
    asset_type: Optional[str] = None,
    query: Optional[str] = None,
) -> List[Dict]:
    where = {"standard_code": {"$eq": standard_code}} if standard_code else None
    return _hybrid_search(
        "ISOStandard",
        query or standard_code or "",
        where=where,
        asset_type_filter=asset_type or None,
    )


def retrieve_asset_intelligence(asset_id: str, query: str) -> List[Dict]:
    """Multi-collection search: EquipmentManual + MaintenanceLog + ModelExplanation."""
    from apps.assets.models import Asset
    try:
        asset = Asset.objects.get(id=asset_id)
        asset_type = asset.asset_type
    except Asset.DoesNotExist:
        return []

    results = []
    results += _hybrid_search("EquipmentManual", query, asset_type_filter=asset_type)
    results += _hybrid_search("MaintenanceLog", query, asset_id_filter=str(asset_id))
    results += _hybrid_search("ModelExplanation", query, asset_id_filter=str(asset_id))

    results.sort(key=lambda x: x.get("rrf_score", 0) or (1.0 - x.get("distance", 1.0)), reverse=True)
    return results[:8]


def retrieve_safety_codes(asset_type: Optional[str] = None, query: Optional[str] = None) -> List[Dict]:
    return _hybrid_search(
        "SafetyCode",
        query or "safety procedures",
        asset_type_filter=asset_type or None,
        limit=5,
    )

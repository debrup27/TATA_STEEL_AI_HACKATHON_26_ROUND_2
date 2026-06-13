"""
RAG retrieval functions:
- retrieve_sop(asset_id, query, procedure_phase)
- retrieve_iso_compliance(standard_code, asset_id, query)
- retrieve_asset_intelligence(asset_id, query)
- retrieve_safety_codes(asset_id, query)
"""
from typing import Optional, List, Dict
from apps.rag.embedder import embed_chunk
from apps.rag.chroma_client import get_chroma_client


def _vector_search(collection_name: str, query: str, where: dict = None, limit: int = 5) -> List[Dict]:
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

        kwargs = {
            "query_embeddings": [query_vector],
            "n_results": min(limit, n),
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
            output.append({"properties": {**meta, "content": doc}, "distance": dist})
        return output
    except Exception:
        return []


def retrieve_sop(asset_type: str, query: str, procedure_phase: Optional[str] = None) -> List[Dict]:
    where = {"asset_scope": {"$contains": asset_type}}
    if procedure_phase:
        where = {"$and": [{"asset_scope": {"$contains": asset_type}}, {"procedure_phase": {"$eq": procedure_phase}}]}
    return _vector_search("SOP", query, where=where)


def retrieve_iso_compliance(
    standard_code: Optional[str] = None,
    asset_type: Optional[str] = None,
    query: Optional[str] = None,
) -> List[Dict]:
    where = {"standard_code": {"$eq": standard_code}} if standard_code else None
    return _vector_search("ISOStandard", query or standard_code or "", where=where)


def retrieve_asset_intelligence(asset_id: str, query: str) -> List[Dict]:
    """Multi-collection search: EquipmentManual + MaintenanceLog + ModelExplanation."""
    from apps.assets.models import Asset
    try:
        asset = Asset.objects.get(id=asset_id)
        asset_type = asset.asset_type
    except Asset.DoesNotExist:
        return []

    results = []
    results += _vector_search("EquipmentManual", query, where={"asset_scope": {"$contains": asset_type}})
    results += _vector_search("MaintenanceLog", query, where={"asset_id": {"$eq": str(asset_id)}})
    results += _vector_search("ModelExplanation", query, where={"asset_id": {"$eq": str(asset_id)}})

    results.sort(key=lambda x: x.get("distance", 1.0))
    return results[:8]


def retrieve_safety_codes(asset_type: Optional[str] = None, query: Optional[str] = None) -> List[Dict]:
    return _vector_search("SafetyCode", query or "safety procedures", limit=5)

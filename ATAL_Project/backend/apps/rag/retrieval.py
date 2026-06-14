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


_COLLECTION_KEYS = {
    "sop": "SOP",
    "iso": "ISOStandard",
    "safety": "SafetyCode",
    "manual": "EquipmentManual",
    "maintenance_log": "MaintenanceLog",
    "model_explanation": "ModelExplanation",
}


def _title_matches(hit: Dict, titles_lower: set[str]) -> bool:
    if not titles_lower:
        return True
    props = hit.get("properties", {})
    content = (props.get("content") or "").lower()
    for key in ("title", "source_doc", "standard_code", "source_url"):
        val = (props.get(key) or "").lower()
        if not val:
            continue
        if val in titles_lower or any(t in val or val in t for t in titles_lower):
            return True
    # Fallback: match salient tokens from the library title inside chunk text
    for title in titles_lower:
        tokens = [t for t in title.replace("-", " ").split() if len(t) >= 3 or t.isdigit()]
        if not tokens:
            continue
        hits = sum(1 for t in tokens if t in content)
        if hits >= min(2, len(tokens)):
            return True
        if any(t.isdigit() and t in content for t in tokens):
            return True
    return False


def retrieve_for_collections(
    query: str,
    collections: List[str],
    *,
    asset_id: Optional[str] = None,
    document_titles: Optional[List[str]] = None,
    limit_per_collection: int = 4,
) -> List[Dict]:
    """Retrieve only from user-selected collection keys (opt-in RAG)."""
    if not collections:
        return []

    titles_lower = {t.lower() for t in document_titles} if document_titles else set()
    results: List[Dict] = []

    for key in collections:
        if key == "asset_intelligence" and asset_id:
            results += retrieve_asset_intelligence(asset_id, query)
            continue
        coll_name = _COLLECTION_KEYS.get(key)
        if not coll_name:
            continue
        hits = _hybrid_search(coll_name, query, limit=limit_per_collection * 2)
        if titles_lower:
            filtered = [h for h in hits if _title_matches(h, titles_lower)]
            hits = filtered if filtered else hits
        results += hits[:limit_per_collection]

    results.sort(
        key=lambda x: x.get("rrf_score", 0) or (1.0 - x.get("distance", 1.0)),
        reverse=True,
    )
    return results[:12]


def retrieve_by_document_titles(
    query: str,
    document_titles: List[str],
    *,
    limit: int = 8,
) -> List[Dict]:
    """Fallback when Chroma title metadata does not match library display names."""
    if not document_titles:
        return []

    from apps.rag.models import Document

    titles_lower = {t.lower().strip() for t in document_titles if t}
    if not titles_lower:
        return []

    query_tokens = [t for t in query.lower().split() if len(t) >= 3]
    output: List[Dict] = []

    for doc in Document.objects.filter(is_ingested=True).order_by("title")[:200]:
        title_lower = doc.title.lower()
        if title_lower not in titles_lower and not any(
            t in title_lower or title_lower in t for t in titles_lower
        ):
            continue
        try:
            from apps.rag.chunker import chunk_document

            chunks = chunk_document(doc)
        except Exception:
            continue
        for chunk in chunks:
            content = (chunk.get("content") or "").strip()
            if not content:
                continue
            if query_tokens:
                lower = content.lower()
                if not any(tok in lower for tok in query_tokens):
                    continue
            output.append({
                "properties": {
                    "title": doc.title,
                    "content": content[:4000],
                    "source_doc": doc.title,
                    "document_id": str(doc.id),
                    "section": chunk.get("section", "") or "",
                    "doc_type": doc.doc_type,
                },
                "source": "library",
                "distance": 0.2,
            })
            if len(output) >= limit:
                return output

    if not output:
        for doc in Document.objects.filter(is_ingested=True).order_by("title")[:200]:
            title_lower = doc.title.lower()
            if title_lower not in titles_lower and not any(
                t in title_lower or title_lower in t for t in titles_lower
            ):
                continue
            try:
                from apps.rag.chunker import chunk_document

                chunks = chunk_document(doc)
            except Exception:
                continue
            for chunk in chunks[:4]:
                content = (chunk.get("content") or "").strip()
                if content:
                    output.append({
                        "properties": {
                            "title": doc.title,
                            "content": content[:4000],
                            "source_doc": doc.title,
                            "document_id": str(doc.id),
                            "section": chunk.get("section", "") or "",
                            "doc_type": doc.doc_type,
                        },
                        "source": "library",
                        "distance": 0.25,
                    })
                    if len(output) >= limit:
                        return output

    if not output:
        for doc in Document.objects.filter(is_ingested=True, title__in=document_titles)[:limit]:
            try:
                from apps.rag.chunker import chunk_document

                chunks = chunk_document(doc)
            except Exception:
                continue
            for chunk in chunks[:3]:
                content = (chunk.get("content") or "").strip()
                if content:
                    output.append({
                        "properties": {
                            "title": doc.title,
                            "content": content[:4000],
                            "source_doc": doc.title,
                            "document_id": str(doc.id),
                            "section": chunk.get("section", "") or "",
                            "doc_type": doc.doc_type,
                        },
                        "source": "library",
                        "distance": 0.25,
                    })
                    if len(output) >= limit:
                        return output

    return output[:limit]


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

"""RAG ingestion pipeline tasks."""
import logging
import uuid
from celery import shared_task

logger = logging.getLogger(__name__)


def _clear_document_vectors(doc):
    """Remove prior Chroma vectors for a document before re-ingest."""
    if not doc.chroma_object_ids:
        return
    try:
        from apps.rag.chroma_client import get_chroma_client
        client = get_chroma_client()
        collection = client.get_or_create_collection(
            name=doc.chroma_collection,
            metadata={"hnsw:space": "cosine"},
        )
        collection.delete(ids=doc.chroma_object_ids)
    except Exception as exc:
        logger.warning("rag_clear_vectors doc_id=%s error=%s", doc.id, exc)


@shared_task(name="apps.rag.ingest_document")
def ingest_document(document_id: str, force: bool = False):
    from apps.rag.models import Document
    from apps.rag.chroma_client import get_chroma_client
    from apps.rag.chunker import chunk_document
    from apps.rag.embedder import embed_chunks
    from apps.rag.bm25_index import refresh_collection
    from django.utils import timezone

    doc = Document.objects.get(id=document_id)
    if doc.is_ingested and not force:
        logger.info("rag_ingest_skip doc_id=%s already ingested", doc.id)
        return

    try:
        if force:
            _clear_document_vectors(doc)

        client = get_chroma_client()
        chunks = chunk_document(doc)
        if not chunks:
            logger.warning("rag_ingest_empty doc_id=%s title=%s", doc.id, doc.title)
            return

        embeddings = embed_chunks([c["content"] for c in chunks])

        collection = client.get_or_create_collection(
            name=doc.chroma_collection,
            metadata={"hnsw:space": "cosine"},
        )
        ids = [str(uuid.uuid4()) for _ in chunks]
        collection.upsert(
            ids=ids,
            documents=[c["content"] for c in chunks],
            embeddings=embeddings,
            metadatas=[{k: str(v) if v is not None else "" for k, v in c.items() if k != "content"} for c in chunks],
        )

        doc.chroma_object_ids = ids
        doc.indexed_at = timezone.now()
        doc.is_ingested = True
        doc.save(update_fields=["chroma_object_ids", "indexed_at", "is_ingested"])
        refresh_collection(doc.chroma_collection)
        logger.info("rag_ingest_complete doc_id=%s chunks=%d", doc.id, len(chunks))
    except Exception as exc:
        logger.error("rag_ingest_error doc_id=%s error=%s", doc.id, exc)
        raise


@shared_task(name="apps.rag.ingest_maintenance_log")
def ingest_maintenance_log(event_id: str):
    from apps.maintenance.models import MaintenanceEvent
    from apps.rag.models import Document

    event = MaintenanceEvent.objects.select_related("asset").get(id=event_id)
    doc_title = f"MaintenanceLog:{event_id}"
    doc, _ = Document.objects.get_or_create(
        title=doc_title,
        defaults={
            "doc_type": Document.DocType.MAINTENANCE_LOG,
            "asset_scope": [event.asset.asset_type],
            "chroma_collection": "MaintenanceLog",
        },
    )
    # Store event narrative in local_path sentinel — chunker reads MaintenanceEvent
    doc.local_path = f"maintenance_event:{event_id}"
    doc.save(update_fields=["local_path"])
    ingest_document(str(doc.id), force=True)


@shared_task(name="apps.rag.update_from_feedback")
def update_from_feedback(feedback_id: str):
    from apps.feedback.models import Feedback
    from apps.rag.chroma_client import get_chroma_client

    feedback = Feedback.objects.select_related("report__asset").get(id=feedback_id)
    if feedback.feedback_type not in ("correct", "confirm"):
        return

    try:
        client = get_chroma_client()
        collection = client.get_or_create_collection("MaintenanceLog", metadata={"hnsw:space": "cosine"})
        collection.upsert(
            ids=[str(uuid.uuid4())],
            documents=[str(feedback.corrected_values)],
            metadatas=[{
                "asset_id": str(feedback.report.asset_id),
                "event_type": "feedback_correction",
                "outcome": "expert_verified",
            }],
        )
        feedback.chroma_updated = True
        feedback.save(update_fields=["chroma_updated"])
        logger.info("rag_feedback_update feedback_id=%s", feedback_id)
    except Exception as exc:
        logger.error("rag_feedback_error error=%s", exc)

"""RAG ingestion pipeline tasks."""
import logging
import uuid
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.rag.ingest_document")
def ingest_document(document_id: str):
    from apps.rag.models import Document
    from apps.rag.chroma_client import get_chroma_client
    from apps.rag.chunker import chunk_document
    from apps.rag.embedder import embed_chunks
    from django.utils import timezone

    doc = Document.objects.get(id=document_id)
    try:
        client = get_chroma_client()
        chunks = chunk_document(doc)
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
            metadatas=[{k: v for k, v in c.items() if k != "content"} for c in chunks],
        )

        doc.chroma_object_ids = ids
        doc.indexed_at = timezone.now()
        doc.is_ingested = True
        doc.save(update_fields=["chroma_object_ids", "indexed_at", "is_ingested"])
        logger.info("rag_ingest_complete doc_id=%s chunks=%d", doc.id, len(chunks))
    except Exception as exc:
        logger.error("rag_ingest_error doc_id=%s error=%s", doc.id, exc)
        raise


@shared_task(name="apps.rag.ingest_maintenance_log")
def ingest_maintenance_log(event_id: str):
    from apps.maintenance.models import MaintenanceEvent
    from apps.rag.models import Document
    event = MaintenanceEvent.objects.select_related("asset").get(id=event_id)
    doc, _ = Document.objects.get_or_create(
        title=f"MaintenanceLog:{event_id}",
        defaults={
            "doc_type": Document.DocType.MAINTENANCE_LOG,
            "asset_scope": [event.asset.asset_type],
            "chroma_collection": "MaintenanceLog",
        },
    )
    ingest_document.apply_async(args=[str(doc.id)])


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

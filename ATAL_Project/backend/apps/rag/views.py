from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.rag.models import Document
from apps.users.permissions import IsAdmin


class DocumentIngestView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        from apps.rag.tasks import ingest_document
        doc, created = Document.objects.get_or_create(
            title=request.data.get("title"),
            defaults={
                "doc_type": request.data.get("doc_type", "manual"),
                "asset_scope": request.data.get("asset_scope", []),
                "chroma_collection": request.data.get("chroma_collection", "EquipmentManual"),
                "source_url": request.data.get("source_url", ""),
            },
        )
        ingest_document.apply_async(args=[str(doc.id)])
        return Response(
            {"document_id": str(doc.id), "created": created, "status": "queued"},
            status=status.HTTP_202_ACCEPTED,
        )


class DocumentListView(APIView):
    """GET /api/v1/rag/documents/ — list ingested corpus documents for MANAS selector."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        doc_type = request.query_params.get("type")
        qs = Document.objects.filter(is_ingested=True).order_by("title")
        if doc_type:
            qs = qs.filter(doc_type=doc_type)
        data = [
            {
                "id": str(d.id),
                "title": d.title,
                "doc_type": d.doc_type,
                "chroma_collection": d.chroma_collection,
                "source_url": d.source_url,
                "indexed_at": d.indexed_at.isoformat() if d.indexed_at else None,
            }
            for d in qs[:200]
        ]
        return Response({"documents": data, "count": len(data)})


class DocumentPreviewView(APIView):
    """GET /api/v1/rag/documents/<id>/preview/ — excerpt for concierge selector."""
    permission_classes = [IsAuthenticated]

    def get(self, request, document_id):
        try:
            doc = Document.objects.get(id=document_id, is_ingested=True)
        except Document.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        excerpt = ""
        try:
            from apps.rag.chroma_client import get_chroma_client
            client = get_chroma_client()
            coll = client.get_collection(doc.chroma_collection)
            if doc.chroma_object_ids:
                result = coll.get(
                    ids=doc.chroma_object_ids[:1],
                    include=["documents"],
                )
                if result.get("documents") and result["documents"][0]:
                    excerpt = result["documents"][0][:2500]
        except Exception:
            pass

        if not excerpt:
            try:
                from apps.rag.chunker import chunk_document
                chunks = chunk_document(doc)
                if chunks:
                    excerpt = (chunks[0].get("content") or "")[:2500]
            except Exception:
                pass

        return Response({
            "id": str(doc.id),
            "title": doc.title,
            "doc_type": doc.doc_type,
            "excerpt": excerpt or "No preview available.",
        })


class RAGQueryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.rag.retrieval import (
            retrieve_sop, retrieve_iso_compliance,
            retrieve_asset_intelligence, retrieve_safety_codes,
        )
        query = request.data.get("query", "")
        retrieval_type = request.data.get("type", "asset_intelligence")
        asset_id = request.data.get("asset_id")
        standard_code = request.data.get("standard_code")
        procedure_phase = request.data.get("procedure_phase")
        asset_type = request.data.get("asset_type")

        if retrieval_type == "sop":
            results = retrieve_sop(asset_type or "", query, procedure_phase)
        elif retrieval_type == "iso_compliance":
            results = retrieve_iso_compliance(standard_code, asset_type, query)
        elif retrieval_type == "safety_codes":
            results = retrieve_safety_codes(asset_type, query)
        else:
            results = retrieve_asset_intelligence(asset_id or "", query)

        return Response({"results": results, "count": len(results)})

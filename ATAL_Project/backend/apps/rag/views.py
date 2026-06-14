from pathlib import Path

from django.http import FileResponse
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
    """GET /api/v1/rag/documents/<id>/preview/ — readable excerpt for MANAS viewer."""
    permission_classes = [IsAuthenticated]

    PREVIEW_CHAR_LIMIT = 24_000
    PREVIEW_CHUNK_LIMIT = 24

    def get(self, request, document_id):
        try:
            doc = Document.objects.get(id=document_id, is_ingested=True)
        except Document.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        excerpt, truncated = self._build_preview(doc)
        source_format = self._source_format(doc)

        return Response({
            "id": str(doc.id),
            "title": doc.title,
            "doc_type": doc.doc_type,
            "excerpt": excerpt or "No preview available.",
            "truncated": truncated,
            "char_count": len(excerpt or ""),
            "source_format": source_format,
        })

    def _source_format(self, doc) -> str:
        from apps.rag.extractors import resolve_local_path

        local = resolve_local_path(doc)
        if local and local.is_file():
            suffix = local.suffix.lower()
            if suffix == ".pdf":
                return "pdf"
            if suffix in (".md", ".markdown"):
                return "markdown"
            if suffix in (".html", ".htm"):
                return "html"
            return "text"
        if getattr(doc, "local_path", None) and str(doc.local_path).startswith("maintenance_event:"):
            return "markdown"
        return "text"

    def _build_preview(self, doc) -> tuple[str, bool]:
        limit = self.PREVIEW_CHAR_LIMIT

        try:
            from apps.rag.extractors import extract_text
            raw, kind = extract_text(doc)
            if raw.strip() and kind not in ("placeholder",):
                if kind == "synthetic":
                    from apps.rag.chunker import _SYNTHETIC_CORPUS
                    raw = _SYNTHETIC_CORPUS.get(doc.title, raw)
                if raw.strip():
                    return raw[:limit], len(raw) > limit
        except Exception:
            pass

        try:
            from apps.rag.chunker import chunk_document
            chunks = chunk_document(doc)
            if chunks:
                parts = [(c.get("content") or "").strip() for c in chunks if c.get("content")]
                joined = "\n\n---\n\n".join(parts)
                if joined.strip():
                    return joined[:limit], len(joined) > limit
        except Exception:
            pass

        try:
            from apps.rag.chroma_client import get_chroma_client
            client = get_chroma_client()
            coll = client.get_collection(doc.chroma_collection)
            if doc.chroma_object_ids:
                ids = doc.chroma_object_ids[: self.PREVIEW_CHUNK_LIMIT]
                result = coll.get(ids=ids, include=["documents"])
                docs = result.get("documents") or []
                parts = [t.strip() for t in docs if t and str(t).strip()]
                if parts:
                    joined = "\n\n---\n\n".join(parts)
                    return joined[:limit], len(joined) > limit
        except Exception:
            pass

        return "", False


class DocumentFileView(APIView):
    """GET /api/v1/rag/documents/<id>/file/ — raw corpus file for MANAS PDF/markdown viewer."""
    permission_classes = [IsAuthenticated]

    CONTENT_TYPES = {
        ".pdf": "application/pdf",
        ".md": "text/markdown; charset=utf-8",
        ".markdown": "text/markdown; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
    }

    def get(self, request, document_id):
        from apps.rag.extractors import resolve_local_path

        try:
            doc = Document.objects.get(id=document_id, is_ingested=True)
        except Document.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        local = resolve_local_path(doc)
        if not local or not local.is_file():
            return Response({"detail": "File not available on disk."}, status=status.HTTP_404_NOT_FOUND)

        content_type = self.CONTENT_TYPES.get(local.suffix.lower(), "application/octet-stream")
        return FileResponse(local.open("rb"), content_type=content_type, filename=local.name)


class UploadExtractView(APIView):
    """POST /api/v1/rag/extract-upload/ — OCR/visual text extraction for MANAS uploads."""
    permission_classes = [IsAuthenticated]

    MAX_BYTES = 15_000_000

    def post(self, request):
        import tempfile
        from apps.rag.extractors import extract_upload_file

        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "file is required"}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > self.MAX_BYTES:
            return Response({"detail": "file too large"}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

        suffix = Path(upload.name).suffix.lower() or ".bin"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in upload.chunks():
                tmp.write(chunk)
            tmp_path = Path(tmp.name)

        try:
            text, kind = extract_upload_file(tmp_path)
            text = (text or "").strip()
            return Response({
                "text": text,
                "kind": kind,
                "char_count": len(text),
                "filename": upload.name,
            })
        except Exception as exc:
            return Response(
                {"detail": f"Could not extract text: {exc}"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        finally:
            tmp_path.unlink(missing_ok=True)


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

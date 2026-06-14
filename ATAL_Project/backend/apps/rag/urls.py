from django.urls import path
from apps.rag.views import DocumentIngestView, DocumentListView, DocumentPreviewView, RAGQueryView

urlpatterns = [
    path("documents/", DocumentListView.as_view()),
    path("documents/<uuid:document_id>/preview/", DocumentPreviewView.as_view()),
    path("ingest/", DocumentIngestView.as_view()),
    path("query/", RAGQueryView.as_view()),
]

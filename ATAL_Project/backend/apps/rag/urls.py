from django.urls import path
from apps.rag.views import DocumentIngestView, DocumentListView, RAGQueryView

urlpatterns = [
    path("documents/", DocumentListView.as_view()),
    path("ingest/", DocumentIngestView.as_view()),
    path("query/", RAGQueryView.as_view()),
]

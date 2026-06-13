from django.urls import path
from apps.rag.views import DocumentIngestView, RAGQueryView

urlpatterns = [
    path("ingest/", DocumentIngestView.as_view()),
    path("query/", RAGQueryView.as_view()),
]

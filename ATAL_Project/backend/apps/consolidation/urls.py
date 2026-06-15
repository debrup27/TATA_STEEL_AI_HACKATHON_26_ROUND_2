from django.urls import path
from apps.consolidation.views import ConsolidationSyncView

urlpatterns = [
    # Synchronous only — consolidation runs the agentic LLM graph inline (never in
    # a Celery worker). The former async/result endpoints were removed.
    path("<uuid:asset_id>/", ConsolidationSyncView.as_view()),
]

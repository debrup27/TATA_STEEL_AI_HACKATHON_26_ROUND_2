from django.urls import path
from apps.consolidation.views import (
    ConsolidationSyncView, ConsolidationAsyncView, ConsolidationResultView,
)

urlpatterns = [
    path("<uuid:asset_id>/", ConsolidationSyncView.as_view()),
    path("<uuid:asset_id>/async/", ConsolidationAsyncView.as_view()),
    path("result/<str:task_id>/", ConsolidationResultView.as_view()),
]

from django.urls import path
from apps.assets.diagnostics_views import (
  DiagnosticsListView,
  DiagnosticsDetailView,
  DiagnosticsRefreshView,
  DiagnosticsRcaInsightView,
  DiagnosticsDefectInsightView,
)

urlpatterns = [
  path("", DiagnosticsListView.as_view()),
  path("<uuid:asset_id>/", DiagnosticsDetailView.as_view()),
  path("<uuid:asset_id>/refresh/", DiagnosticsRefreshView.as_view()),
  path("<uuid:asset_id>/rca-insight/", DiagnosticsRcaInsightView.as_view()),
  path("<uuid:asset_id>/defect-insight/", DiagnosticsDefectInsightView.as_view()),
]

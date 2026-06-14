from django.urls import path
from apps.telemetry.views import TelemetryIngestView, TelemetryTimeSeriesView, TelemetrySnapshotView

urlpatterns = [
    path("ingest/", TelemetryIngestView.as_view()),
    path("snapshot/", TelemetrySnapshotView.as_view()),
    path("<uuid:asset_id>/", TelemetryTimeSeriesView.as_view()),
]

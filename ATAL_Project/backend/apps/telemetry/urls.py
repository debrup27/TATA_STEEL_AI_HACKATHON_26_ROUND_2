from django.urls import path
from apps.telemetry.views import TelemetryIngestView, TelemetryTimeSeriesView

urlpatterns = [
    path("ingest/", TelemetryIngestView.as_view()),
    path("<uuid:asset_id>/", TelemetryTimeSeriesView.as_view()),
]

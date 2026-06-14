from django.urls import path

from apps.assets.samvidhaan_views import (
    SamvidhaanGraphsView,
    SamvidhaanHistoricalReportsView,
    SamvidhaanSeedHistoricalView,
)

urlpatterns = [
    path("graphs/", SamvidhaanGraphsView.as_view()),
    path("historical-reports/", SamvidhaanHistoricalReportsView.as_view()),
    path("historical-reports/seed/", SamvidhaanSeedHistoricalView.as_view()),
]

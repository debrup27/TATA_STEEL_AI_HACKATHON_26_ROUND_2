from django.urls import path
from apps.assets.views import AssetSimulationView, PlantSimulationView
from apps.assets.anomaly_trip_views import AnomalyTripView, AnomalyTripClearView

urlpatterns = [
    path("plant/", PlantSimulationView.as_view(), name="plant-simulation"),
    path("trip/", AnomalyTripView.as_view(), name="anomaly-trip"),
    path("trip/clear/", AnomalyTripClearView.as_view(), name="anomaly-trip-clear"),
    path("<uuid:asset_id>/", AssetSimulationView.as_view(), name="asset-simulation"),
]

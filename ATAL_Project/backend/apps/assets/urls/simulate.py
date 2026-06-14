from django.urls import path
from apps.assets.views import AssetSimulationView, PlantSimulationView

urlpatterns = [
    path("plant/", PlantSimulationView.as_view(), name="plant-simulation"),
    path("<uuid:asset_id>/", AssetSimulationView.as_view(), name="asset-simulation"),
]

from django.urls import path
from apps.consolidation.views import BottleneckScoreView, BottleneckInsightView, PlantKPIView
from apps.assets.plant_snapshot_views import PlantSnapshotView

urlpatterns = [
    path("snapshot/", PlantSnapshotView.as_view()),
    path("bottleneck-score/", BottleneckScoreView.as_view()),
    path("bottleneck-score/<uuid:asset_id>/insight/", BottleneckInsightView.as_view()),
    path("kpis/", PlantKPIView.as_view()),
]

from django.urls import path
from apps.consolidation.views import BottleneckScoreView, PlantKPIView

urlpatterns = [
    path("bottleneck-score/", BottleneckScoreView.as_view()),
    path("kpis/", PlantKPIView.as_view()),
]

from django.urls import path
from apps.ml.views import (
    MLPredictView, MLPredictAsyncView, MLPredictionViewSet,
    MLPredictionExplainView, CompetitionInferView, CompetitionExplainView,
    CrossStageView,
)

urlpatterns = [
    path("<uuid:asset_id>/<str:model_type>/predict/", MLPredictView.as_view()),
    path("<uuid:asset_id>/<str:model_type>/predict/async/", MLPredictAsyncView.as_view()),
    path("predictions/<str:pk>/", MLPredictionViewSet.as_view({"get": "retrieve"})),
    path("predictions/<uuid:pk>/explain/", MLPredictionExplainView.as_view()),
    path("competition/infer/", CompetitionInferView.as_view()),
    path("competition/explain/<str:coil_id>/", CompetitionExplainView.as_view()),
    path("cross-stage/<uuid:asset_id>/", CrossStageView.as_view()),
]

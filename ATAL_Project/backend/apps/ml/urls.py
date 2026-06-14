from django.urls import path
from apps.ml.views import (
    MLPredictView, MLPredictAsyncView, MLPredictionViewSet,
    MLPredictionListView, MLPredictionTaskStatusView,
    MLPredictionExplainView, CompetitionInferView,
    CrossStageView, ModelStatusView, RetrainView, RetrainStatusView,
)

urlpatterns = [
    # Inference
    path("<uuid:asset_id>/<str:model_type>/predict/", MLPredictView.as_view()),
    path("<uuid:asset_id>/<str:model_type>/predict/async/", MLPredictAsyncView.as_view()),

    # Prediction records
    path("predictions/", MLPredictionListView.as_view()),
    path("predictions/task/<str:task_id>/", MLPredictionTaskStatusView.as_view()),
    path("predictions/<uuid:pk>/", MLPredictionViewSet.as_view({"get": "retrieve"})),
    path("predictions/<uuid:pk>/explain/", MLPredictionExplainView.as_view()),

    # Model registry
    path("models/status/", ModelStatusView.as_view()),

    # Retrain (Admin)
    path("retrain/", RetrainView.as_view()),
    path("retrain/<str:task_id>/", RetrainStatusView.as_view()),

    # Competition (Admin)
    path("competition/infer/", CompetitionInferView.as_view()),

    # Cross-stage correlation
    path("cross-stage/<uuid:asset_id>/", CrossStageView.as_view()),
]

from rest_framework import serializers
from apps.ml.models import MLModel, MLPrediction


class MLModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLModel
        fields = [
            "id", "name", "asset", "model_type", "algorithm", "version",
            "artifact_path", "training_date", "training_metrics",
            "acceptance_thresholds", "status", "created_at",
        ]


class MLPredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MLPrediction
        fields = [
            "id", "model", "asset", "prediction_time", "prediction_output",
            "confidence", "shap_values", "celery_task_id",
        ]

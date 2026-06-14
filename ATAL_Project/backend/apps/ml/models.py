import uuid
from django.db import models
from apps.assets.models import Asset
from apps.users.models import User


class MLModel(models.Model):
    class Status(models.TextChoices):
        STAGING = "staging", "Staging"
        PRODUCTION = "production", "Production"
        DEPRECATED = "deprecated", "Deprecated"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    asset = models.ForeignKey(
        Asset, on_delete=models.SET_NULL, null=True, blank=True, related_name="ml_models"
    )
    model_type = models.CharField(max_length=100)  # rul_predictor, anomaly_detector, classifier
    algorithm = models.CharField(max_length=100)   # xgboost, lightgbm, isolation_forest, physics
    version = models.CharField(max_length=20)      # semver e.g. 1.0.0
    artifact_path = models.CharField(max_length=500)
    training_date = models.DateTimeField(null=True, blank=True)
    training_metrics = models.JSONField(default=dict, blank=True)
    acceptance_thresholds = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.STAGING)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_models"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ml_model"
        unique_together = [["name", "version"]]

    def __str__(self):
        return f"{self.name} v{self.version} ({self.status})"


class MLPrediction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    model = models.ForeignKey(MLModel, null=True, blank=True, on_delete=models.SET_NULL, related_name="predictions")
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="predictions")
    prediction_time = models.DateTimeField(auto_now_add=True)
    input_features = models.JSONField(default=dict)
    prediction_output = models.JSONField(default=dict)
    confidence = models.FloatField(null=True, blank=True)
    shap_values = models.JSONField(null=True, blank=True)
    celery_task_id = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "ml_prediction"
        indexes = [
            models.Index(fields=["asset", "prediction_time"]),
            models.Index(fields=["model", "prediction_time"]),
        ]
        ordering = ["-prediction_time"]

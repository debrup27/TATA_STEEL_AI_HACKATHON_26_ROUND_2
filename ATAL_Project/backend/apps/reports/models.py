import uuid
from django.db import models
from apps.assets.models import Asset
from apps.users.models import User
from apps.ml.models import MLPrediction


class MaintenanceReport(models.Model):
    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        AI_GENERATED = "ai_generated", "AI Generated"

    class FeedbackStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        CORRECTED = "corrected", "Corrected"

    class RiskLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="reports")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reports"
    )
    source = models.CharField(max_length=20, choices=Source.choices)
    diagnosis = models.TextField(blank=True)
    rca = models.TextField(blank=True)
    risk_level = models.CharField(
        max_length=10, choices=RiskLevel.choices, null=True, blank=True
    )
    urgency_score = models.FloatField(null=True, blank=True)
    recommendations = models.JSONField(default=list)  # [{step, rationale, iso_ref}]
    immediate_actions = models.JSONField(default=list)
    long_term_monitoring = models.JSONField(default=list)  # [{sensor, threshold, interval, rationale}]
    spare_strategy = models.JSONField(default=dict)
    citations = models.JSONField(default=list)  # [{doc, section, page, iso_ref}]
    report_text = models.TextField(blank=True)
    feedback_status = models.CharField(
        max_length=10, choices=FeedbackStatus.choices, default=FeedbackStatus.PENDING
    )
    llm_prediction = models.ForeignKey(
        MLPrediction, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reports"
    )

    class Meta:
        db_table = "reports_maintenance_report"
        indexes = [
            models.Index(fields=["asset", "created_at"]),
            models.Index(fields=["risk_level", "created_at"]),
        ]
        ordering = ["-created_at"]

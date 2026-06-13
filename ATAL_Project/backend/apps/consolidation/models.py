import uuid
from django.db import models
from apps.assets.models import Asset


class ConsolidationResult(models.Model):
    """Stores the full consolidated payload + LLM decision for auditing."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="consolidation_results")
    celery_task_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    consolidated_payload = models.JSONField(null=True, blank=True)
    decision_output = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "consolidation_result"
        indexes = [
            models.Index(fields=["asset", "created_at"]),
            models.Index(fields=["celery_task_id"]),
        ]
        ordering = ["-created_at"]

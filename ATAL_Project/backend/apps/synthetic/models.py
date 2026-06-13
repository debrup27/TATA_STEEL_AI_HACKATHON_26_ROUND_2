import uuid
from django.db import models
from apps.assets.models import Asset


class SyntheticGenerationRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(
        Asset, on_delete=models.CASCADE, null=True, blank=True,
        related_name="synthetic_runs"
    )
    generator_name = models.CharField(max_length=100)
    rows_generated = models.PositiveIntegerField(default=0)
    fault_events_injected = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    artifact_path = models.CharField(max_length=500, blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "synthetic_generation_run"
        ordering = ["-started_at"]

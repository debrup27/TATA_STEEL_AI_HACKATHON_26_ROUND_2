import uuid
from django.db import models
from apps.assets.models import Asset


class AssetTwinState(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.OneToOneField(Asset, on_delete=models.CASCADE, related_name="twin_state")
    state = models.JSONField(default=dict)
    health_score = models.FloatField(default=100.0)
    active_alerts = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)
    source_snapshot_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "twins_asset_twin_state"


class TwinStateHistory(models.Model):
    """TimescaleDB hypertable — partition key: time"""
    time = models.DateTimeField()
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="twin_history")
    state = models.JSONField(default=dict)
    health_score = models.FloatField()

    class Meta:
        db_table = "twins_state_history"
        indexes = [
            models.Index(fields=["asset", "time"]),
        ]
        ordering = ["-time"]

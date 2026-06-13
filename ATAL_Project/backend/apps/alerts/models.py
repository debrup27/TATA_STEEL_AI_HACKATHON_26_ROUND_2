import uuid
from django.db import models
from apps.assets.models import Asset, SensorDefinition
from apps.users.models import User


class AlarmEvent(models.Model):
    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        ALERT = "alert", "Alert"
        TRIP = "trip", "Trip"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="alarms")
    sensor_def = models.ForeignKey(
        SensorDefinition, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="alarms"
    )
    alarm_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=10, choices=Severity.choices)
    message = models.TextField()
    value_at_alarm = models.FloatField(null=True, blank=True)
    threshold_breached = models.FloatField(null=True, blank=True)
    iso_standard_ref = models.CharField(max_length=50, blank=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="acknowledged_alarms"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "alerts_alarm_event"
        indexes = [
            models.Index(fields=["asset", "severity", "created_at"]),
            models.Index(fields=["acknowledged", "created_at"]),
        ]
        ordering = ["-created_at"]

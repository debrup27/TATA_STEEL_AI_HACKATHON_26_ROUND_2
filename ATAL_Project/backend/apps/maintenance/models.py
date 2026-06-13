import uuid
from django.db import models
from apps.assets.models import Asset, Factory
from apps.users.models import User
from apps.ml.models import MLPrediction


class MaintenanceEvent(models.Model):
    class EventType(models.TextChoices):
        CORRECTIVE = "corrective", "Corrective"
        PREVENTIVE = "preventive", "Preventive"
        PREDICTIVE = "predictive", "Predictive"
        INSPECTION = "inspection", "Inspection"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="maintenance_events")
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    scheduled_date = models.DateTimeField(null=True, blank=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    technician = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="maintenance_events"
    )
    description = models.TextField(blank=True)
    iso14224_classification = models.CharField(max_length=100, blank=True)
    outcome = models.TextField(blank=True)
    parts_used = models.JSONField(default=list, blank=True)
    downtime_hours = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "maintenance_event"
        indexes = [
            models.Index(fields=["asset", "completed_date"]),
        ]


class DelayLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="delay_logs")
    factory = models.ForeignKey(Factory, on_delete=models.CASCADE, related_name="delay_logs")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    delay_type = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    root_cause_assigned = models.CharField(max_length=255, blank=True)
    production_loss_tonnes = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "maintenance_delay_log"


class FaultMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="fault_messages")
    fault_code = models.CharField(max_length=100)
    source_system = models.CharField(max_length=50, default="PLC")  # PLC, SCADA
    message = models.TextField()
    timestamp = models.DateTimeField()
    severity = models.CharField(max_length=20, default="warning")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "maintenance_fault_message"


class WorkOrder(models.Model):
    class Priority(models.TextChoices):
        CRITICAL = "1-critical", "1 — Critical"
        HIGH = "2-high", "2 — High"
        MEDIUM = "3-medium", "3 — Medium"
        LOW = "4-low", "4 — Low"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        CLOSED = "closed", "Closed"

    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        AI_GENERATED = "ai_generated", "AI Generated"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="work_orders")
    priority = models.CharField(max_length=20, choices=Priority.choices)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    recommended_actions = models.JSONField(default=list)
    spare_requirements = models.JSONField(default=list)
    estimated_duration_hrs = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="work_orders"
    )
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    llm_prediction = models.ForeignKey(
        MLPrediction, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="work_orders"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "maintenance_work_order"
        indexes = [
            models.Index(fields=["asset", "status", "priority"]),
        ]

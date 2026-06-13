import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("assets", "0001_initial"),
        ("users", "0001_initial"),
        ("ml", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="MaintenanceEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("event_type", models.CharField(choices=[("corrective", "Corrective"), ("preventive", "Preventive"), ("predictive", "Predictive"), ("inspection", "Inspection")], max_length=20)),
                ("scheduled_date", models.DateTimeField(blank=True, null=True)),
                ("completed_date", models.DateTimeField(blank=True, null=True)),
                ("description", models.TextField(blank=True)),
                ("iso14224_classification", models.CharField(blank=True, max_length=100)),
                ("outcome", models.TextField(blank=True)),
                ("parts_used", models.JSONField(blank=True, default=list)),
                ("downtime_hours", models.FloatField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="maintenance_events", to="assets.asset")),
                ("technician", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="maintenance_events", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "maintenance_event"},
        ),
        migrations.AddIndex(
            model_name="maintenanceevent",
            index=models.Index(fields=["asset", "completed_date"], name="maint_asset_date_idx"),
        ),
        migrations.CreateModel(
            name="DelayLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("start_time", models.DateTimeField()),
                ("end_time", models.DateTimeField(blank=True, null=True)),
                ("delay_type", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                ("root_cause_assigned", models.CharField(blank=True, max_length=255)),
                ("production_loss_tonnes", models.FloatField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="delay_logs", to="assets.asset")),
                ("factory", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="delay_logs", to="assets.factory")),
            ],
            options={"db_table": "maintenance_delay_log"},
        ),
        migrations.CreateModel(
            name="FaultMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("fault_code", models.CharField(max_length=100)),
                ("source_system", models.CharField(default="PLC", max_length=50)),
                ("message", models.TextField()),
                ("timestamp", models.DateTimeField()),
                ("severity", models.CharField(default="warning", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="fault_messages", to="assets.asset")),
            ],
            options={"db_table": "maintenance_fault_message"},
        ),
        migrations.CreateModel(
            name="WorkOrder",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("priority", models.CharField(choices=[("1-critical", "1 — Critical"), ("2-high", "2 — High"), ("3-medium", "3 — Medium"), ("4-low", "4 — Low")], max_length=20)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("recommended_actions", models.JSONField(default=list)),
                ("spare_requirements", models.JSONField(default=list)),
                ("estimated_duration_hrs", models.FloatField(blank=True, null=True)),
                ("status", models.CharField(choices=[("open", "Open"), ("in_progress", "In Progress"), ("closed", "Closed")], default="open", max_length=20)),
                ("source", models.CharField(choices=[("manual", "Manual"), ("ai_generated", "AI Generated")], default="manual", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="work_orders", to="assets.asset")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="work_orders", to=settings.AUTH_USER_MODEL)),
                ("llm_prediction", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="work_orders", to="ml.mlprediction")),
            ],
            options={"db_table": "maintenance_work_order"},
        ),
        migrations.AddIndex(
            model_name="workorder",
            index=models.Index(fields=["asset", "status", "priority"], name="wo_asset_status_idx"),
        ),
    ]

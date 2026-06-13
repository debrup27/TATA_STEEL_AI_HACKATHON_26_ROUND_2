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
            name="MaintenanceReport",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("source", models.CharField(choices=[("manual", "Manual"), ("ai_generated", "AI Generated")], max_length=20)),
                ("diagnosis", models.TextField(blank=True)),
                ("rca", models.TextField(blank=True)),
                ("risk_level", models.CharField(blank=True, choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical")], max_length=10, null=True)),
                ("urgency_score", models.FloatField(blank=True, null=True)),
                ("recommendations", models.JSONField(default=list)),
                ("immediate_actions", models.JSONField(default=list)),
                ("long_term_monitoring", models.JSONField(default=list)),
                ("spare_strategy", models.JSONField(default=dict)),
                ("citations", models.JSONField(default=list)),
                ("report_text", models.TextField(blank=True)),
                ("feedback_status", models.CharField(choices=[("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected"), ("corrected", "Corrected")], default="pending", max_length=10)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reports", to="assets.asset")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reports", to=settings.AUTH_USER_MODEL)),
                ("llm_prediction", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reports", to="ml.mlprediction")),
            ],
            options={"db_table": "reports_maintenance_report", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="maintenancereport",
            index=models.Index(fields=["asset", "created_at"], name="report_asset_time_idx"),
        ),
        migrations.AddIndex(
            model_name="maintenancereport",
            index=models.Index(fields=["risk_level", "created_at"], name="report_risk_time_idx"),
        ),
    ]

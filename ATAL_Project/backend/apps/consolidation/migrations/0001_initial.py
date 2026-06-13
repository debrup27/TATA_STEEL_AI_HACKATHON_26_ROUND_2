import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("assets", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ConsolidationResult",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("celery_task_id", models.CharField(blank=True, max_length=255)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("complete", "Complete"), ("failed", "Failed")], default="pending", max_length=10)),
                ("consolidated_payload", models.JSONField(blank=True, null=True)),
                ("decision_output", models.JSONField(blank=True, null=True)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="consolidation_results", to="assets.asset")),
            ],
            options={"db_table": "consolidation_result", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="consolidationresult",
            index=models.Index(fields=["asset", "created_at"], name="consol_asset_time_idx"),
        ),
        migrations.AddIndex(
            model_name="consolidationresult",
            index=models.Index(fields=["celery_task_id"], name="consol_task_idx"),
        ),
    ]

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("assets", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="MLModel",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("model_type", models.CharField(max_length=100)),
                ("algorithm", models.CharField(max_length=100)),
                ("version", models.CharField(max_length=20)),
                ("artifact_path", models.CharField(max_length=500)),
                ("training_date", models.DateTimeField(blank=True, null=True)),
                ("training_metrics", models.JSONField(blank=True, default=dict)),
                ("acceptance_thresholds", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(choices=[("staging", "Staging"), ("production", "Production"), ("deprecated", "Deprecated")], default="staging", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("asset", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ml_models", to="assets.asset")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_models", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "ml_model", "unique_together": {("name", "version")}},
        ),
        migrations.CreateModel(
            name="MLPrediction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("prediction_time", models.DateTimeField(auto_now_add=True)),
                ("input_features", models.JSONField(default=dict)),
                ("prediction_output", models.JSONField(default=dict)),
                ("confidence", models.FloatField(blank=True, null=True)),
                ("shap_values", models.JSONField(blank=True, null=True)),
                ("celery_task_id", models.CharField(blank=True, max_length=255)),
                ("model", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="predictions", to="ml.mlmodel")),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="predictions", to="assets.asset")),
            ],
            options={"db_table": "ml_prediction", "ordering": ["-prediction_time"]},
        ),
        migrations.AddIndex(
            model_name="mlprediction",
            index=models.Index(fields=["asset", "prediction_time"], name="ml_pred_asset_time_idx"),
        ),
        migrations.AddIndex(
            model_name="mlprediction",
            index=models.Index(fields=["model", "prediction_time"], name="ml_pred_model_time_idx"),
        ),
    ]

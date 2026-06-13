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
            name="AlarmEvent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("alarm_type", models.CharField(max_length=100)),
                ("severity", models.CharField(choices=[("info", "Info"), ("warning", "Warning"), ("alert", "Alert"), ("trip", "Trip")], max_length=10)),
                ("message", models.TextField()),
                ("value_at_alarm", models.FloatField(blank=True, null=True)),
                ("threshold_breached", models.FloatField(blank=True, null=True)),
                ("iso_standard_ref", models.CharField(blank=True, max_length=50)),
                ("acknowledged", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="alarms", to="assets.asset")),
                ("sensor_def", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="alarms", to="assets.sensordefinition")),
                ("acknowledged_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="acknowledged_alarms", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "alerts_alarm_event", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="alarmevent",
            index=models.Index(fields=["asset", "severity", "created_at"], name="alerts_asset_sev_idx"),
        ),
        migrations.AddIndex(
            model_name="alarmevent",
            index=models.Index(fields=["acknowledged", "created_at"], name="alerts_ack_idx"),
        ),
    ]

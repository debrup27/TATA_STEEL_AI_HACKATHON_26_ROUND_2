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
            name="AssetTwinState",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("state", models.JSONField(default=dict)),
                ("health_score", models.FloatField(default=100.0)),
                ("active_alerts", models.JSONField(default=list)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("source_snapshot_id", models.UUIDField(blank=True, null=True)),
                ("asset", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="twin_state", to="assets.asset")),
            ],
            options={"db_table": "twins_asset_twin_state"},
        ),
        migrations.CreateModel(
            name="TwinStateHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("time", models.DateTimeField()),
                ("state", models.JSONField(default=dict)),
                ("health_score", models.FloatField()),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="twin_history", to="assets.asset")),
            ],
            options={"db_table": "twins_state_history", "ordering": ["-time"]},
        ),
        migrations.AddIndex(
            model_name="twinstatehistory",
            index=models.Index(fields=["asset", "time"], name="twins_asset_time_idx"),
        ),
        migrations.RunSQL(
            sql="SELECT create_hypertable('twins_state_history', 'time', if_not_exists => TRUE);",
            reverse_sql="SELECT 1;",
        ),
    ]

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("assets", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SensorReading",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("time", models.DateTimeField()),
                ("value", models.FloatField()),
                ("quality_flag", models.SmallIntegerField(default=0)),
                ("source", models.CharField(choices=[("real", "Real"), ("synthetic", "Synthetic"), ("injected", "Injected (test)")], default="synthetic", max_length=10)),
                ("condition_type", models.CharField(blank=True, max_length=50)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="assets.asset", db_index=False)),
                ("sensor_def", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="assets.sensordefinition", db_index=False)),
            ],
            options={"db_table": "telemetry_sensor_reading", "ordering": ["-time"]},
        ),
        migrations.AddIndex(
            model_name="sensorreading",
            index=models.Index(fields=["asset", "sensor_def", "time"], name="telemetry_asset_sensor_time_idx"),
        ),
        # TimescaleDB hypertable — apply after CREATE TABLE
        migrations.RunSQL(
            sql="SELECT create_hypertable('telemetry_sensor_reading', 'time', if_not_exists => TRUE);",
            reverse_sql="SELECT 1;",
        ),
    ]

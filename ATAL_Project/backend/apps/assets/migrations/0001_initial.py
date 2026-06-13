import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Factory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("code", models.CharField(max_length=10)),
                ("location", models.CharField(blank=True, max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("org", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="factories", to="users.organization")),
            ],
            options={"db_table": "assets_factory", "unique_together": {("org", "code")}},
        ),
        migrations.CreateModel(
            name="Asset",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("asset_type", models.CharField(choices=[("SRF", "Slab Reheating Furnace"), ("HHPD", "High-Pressure Descaler"), ("FS", "Finishing Stands"), ("HAGCC", "Hydraulic AGC Cylinders"), ("APT", "Acid Pickling Tanks"), ("TCMS", "Tandem Cold Mill Stands"), ("CGP", "Continuous Galvanizing Pot"), ("HPAK", "High-Pressure Air Knives")], max_length=10)),
                ("iso_standards", models.JSONField(blank=True, default=list)),
                ("oem_manual_urls", models.JSONField(blank=True, default=list)),
                ("installed_at", models.DateField(blank=True, null=True)),
                ("criticality_level", models.CharField(choices=[("critical", "Critical"), ("high", "High"), ("medium", "Medium"), ("low", "Low")], default="high", max_length=10)),
                ("factory", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="assets", to="assets.factory")),
            ],
            options={"db_table": "assets_asset"},
        ),
        migrations.CreateModel(
            name="SensorDefinition",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("sensor_name", models.CharField(max_length=100)),
                ("sensor_type", models.CharField(choices=[("temperature", "Temperature"), ("pressure", "Pressure"), ("vibration", "Vibration"), ("flow", "Flow"), ("position", "Position"), ("concentration", "Concentration"), ("force", "Force"), ("power", "Power"), ("current", "Current"), ("torque", "Torque"), ("acoustic", "Acoustic Emission")], max_length=20)),
                ("unit", models.CharField(max_length=30)),
                ("normal_min", models.FloatField(blank=True, null=True)),
                ("normal_max", models.FloatField(blank=True, null=True)),
                ("alert_threshold", models.FloatField(blank=True, null=True)),
                ("trip_threshold", models.FloatField(blank=True, null=True)),
                ("iso_standard_ref", models.CharField(blank=True, max_length=50)),
                ("sampling_freq_hz", models.FloatField(default=1.0)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sensors", to="assets.asset")),
            ],
            options={"db_table": "assets_sensor_definition", "unique_together": {("asset", "sensor_name")}},
        ),
        migrations.CreateModel(
            name="SparesPart",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("part_name", models.CharField(max_length=255)),
                ("part_number", models.CharField(blank=True, max_length=100)),
                ("quantity_in_stock", models.PositiveIntegerField(default=0)),
                ("reorder_level", models.PositiveIntegerField(default=1)),
                ("lead_time_days", models.PositiveIntegerField(default=30)),
                ("unit_cost", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("supplier", models.CharField(blank=True, max_length=255)),
                ("asset", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="spares", to="assets.asset")),
            ],
            options={"db_table": "assets_spares_part"},
        ),
    ]

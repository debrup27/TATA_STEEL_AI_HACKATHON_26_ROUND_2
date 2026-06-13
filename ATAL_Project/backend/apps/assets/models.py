import uuid
from django.db import models
from apps.users.models import Organization


class Factory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="factories")
    name = models.CharField(max_length=100)  # Horizon, Zephyr
    code = models.CharField(max_length=10)   # F1-F6
    location = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "assets_factory"
        unique_together = [["org", "code"]]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Asset(models.Model):
    class AssetType(models.TextChoices):
        SRF = "SRF", "Slab Reheating Furnace"
        HHPD = "HHPD", "High-Pressure Descaler"
        FS = "FS", "Finishing Stands"
        HAGCC = "HAGCC", "Hydraulic AGC Cylinders"
        APT = "APT", "Acid Pickling Tanks"
        TCMS = "TCMS", "Tandem Cold Mill Stands"
        CGP = "CGP", "Continuous Galvanizing Pot"
        HPAK = "HPAK", "High-Pressure Air Knives"

    class CriticalityLevel(models.TextChoices):
        CRITICAL = "critical", "Critical"
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    factory = models.ForeignKey(Factory, on_delete=models.CASCADE, related_name="assets")
    name = models.CharField(max_length=100)
    asset_type = models.CharField(max_length=10, choices=AssetType.choices)
    iso_standards = models.JSONField(default=list, blank=True)
    oem_manual_urls = models.JSONField(default=list, blank=True)
    installed_at = models.DateField(null=True, blank=True)
    criticality_level = models.CharField(
        max_length=10, choices=CriticalityLevel.choices, default=CriticalityLevel.HIGH
    )

    class Meta:
        db_table = "assets_asset"

    def __str__(self):
        return f"{self.name} ({self.asset_type})"


class SensorDefinition(models.Model):
    class SensorType(models.TextChoices):
        TEMPERATURE = "temperature", "Temperature"
        PRESSURE = "pressure", "Pressure"
        VIBRATION = "vibration", "Vibration"
        FLOW = "flow", "Flow"
        POSITION = "position", "Position"
        CONCENTRATION = "concentration", "Concentration"
        FORCE = "force", "Force"
        POWER = "power", "Power"
        CURRENT = "current", "Current"
        TORQUE = "torque", "Torque"
        ACOUSTIC = "acoustic", "Acoustic Emission"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="sensors")
    sensor_name = models.CharField(max_length=100)
    sensor_type = models.CharField(max_length=20, choices=SensorType.choices)
    unit = models.CharField(max_length=30)
    normal_min = models.FloatField(null=True, blank=True)
    normal_max = models.FloatField(null=True, blank=True)
    alert_threshold = models.FloatField(null=True, blank=True)
    trip_threshold = models.FloatField(null=True, blank=True)
    iso_standard_ref = models.CharField(max_length=50, blank=True)
    sampling_freq_hz = models.FloatField(default=1.0)

    class Meta:
        db_table = "assets_sensor_definition"
        unique_together = [["asset", "sensor_name"]]

    def __str__(self):
        return f"{self.asset.name} — {self.sensor_name} ({self.unit})"


class SparesPart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="spares")
    part_name = models.CharField(max_length=255)
    part_number = models.CharField(max_length=100, blank=True)
    quantity_in_stock = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=1)
    lead_time_days = models.PositiveIntegerField(default=30)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    supplier = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "assets_spares_part"

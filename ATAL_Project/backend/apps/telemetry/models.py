from django.db import models
from apps.assets.models import Asset, SensorDefinition


class SensorReading(models.Model):
    """TimescaleDB hypertable — partition key: time"""

    class Source(models.TextChoices):
        REAL = "real", "Real"
        SYNTHETIC = "synthetic", "Synthetic"
        INJECTED = "injected", "Injected (test)"

    time = models.DateTimeField()
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, db_index=False)
    sensor_def = models.ForeignKey(SensorDefinition, on_delete=models.CASCADE, db_index=False)
    value = models.FloatField()
    quality_flag = models.SmallIntegerField(default=0)  # 0=good, 1=suspect, 2=bad
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.SYNTHETIC)
    condition_type = models.CharField(max_length=50, blank=True)  # process condition flag

    class Meta:
        db_table = "telemetry_sensor_reading"
        # TimescaleDB will create time-based index; explicit composite index for queries
        indexes = [
            models.Index(fields=["asset", "sensor_def", "time"]),
        ]
        ordering = ["-time"]

    def __str__(self):
        return f"{self.sensor_def.sensor_name}@{self.time}: {self.value}"

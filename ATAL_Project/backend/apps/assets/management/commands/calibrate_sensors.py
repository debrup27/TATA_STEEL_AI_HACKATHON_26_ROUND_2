"""Align each sensor's normal/alert/trip band to its actual nominal generator output.

The synthetic generators emit values on a different scale than the hand-written fixture
thresholds for several sensors (e.g. HHPD header_pressure, HAGCC hysteresis), which made
non-faulted assets read as anomalous. This command derives the normal band from recent nominal
telemetry (p2..p98 + margin) so healthy assets read healthy and fault data still breaches.

Run in entrypoint AFTER seed_initial_telemetry. Idempotent; skips sensors with insufficient data.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Calibrate sensor normal/alert/trip thresholds from recent nominal telemetry"

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, default=60)
        parser.add_argument("--min-samples", type=int, default=15)

    def handle(self, *args, **opts):
        import numpy as np

        from apps.assets.models import SensorDefinition
        from apps.telemetry.models import SensorReading

        since = timezone.now() - timedelta(minutes=opts["minutes"])
        fixed = skipped = 0
        for sd in SensorDefinition.objects.all():
            vals = list(
                SensorReading.objects.filter(sensor_def=sd, time__gte=since)
                .values_list("value", flat=True)[:300]
            )
            if len(vals) < opts["min_samples"]:
                skipped += 1
                continue
            arr = np.asarray(vals, dtype=float)
            p2, p98 = np.percentile(arr, 2), np.percentile(arr, 98)
            span = max(p98 - p2, abs(p98) * 0.05, 1e-6)
            sd.normal_min = round(float(p2 - 0.10 * span), 4)
            sd.normal_max = round(float(p98 + 0.10 * span), 4)
            sd.alert_threshold = round(float(p98 + 0.5 * span), 4)
            sd.trip_threshold = round(float(p98 + 1.0 * span), 4)
            sd.save(update_fields=["normal_min", "normal_max", "alert_threshold", "trip_threshold"])
            fixed += 1

        self.stdout.write(
            self.style.SUCCESS(f"[calibrate_sensors] calibrated={fixed} skipped(no data)={skipped}")
        )

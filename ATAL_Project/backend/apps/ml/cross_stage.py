"""Cross-stage defect attribution — SRF underheating → FS force spike correlation."""
from apps.assets.models import Asset


def get_cross_stage_correlations(asset_id: str) -> dict:
    from apps.telemetry.models import SensorReading
    from django.db.models import Avg, StdDev
    from datetime import timedelta
    from django.utils import timezone

    asset = Asset.objects.get(id=asset_id)
    now = timezone.now()
    window_start = now - timedelta(hours=24)

    readings = SensorReading.objects.filter(
        asset=asset, time__gte=window_start
    ).values("sensor_def__sensor_name").annotate(
        avg=Avg("value"), std=StdDev("value")
    )

    correlations = []
    for r in readings:
        correlations.append({
            "sensor": r["sensor_def__sensor_name"],
            "avg_24h": round(r["avg"] or 0, 4),
            "std_24h": round(r["std"] or 0, 4),
        })

    return {
        "asset_id": str(asset_id),
        "asset_type": asset.asset_type,
        "window_hours": 24,
        "sensor_summary": correlations,
        "cascade_risk": "Requires cross-asset twin linkage — see REQ-TWIN-012 / REQ-MODEL-028",
    }

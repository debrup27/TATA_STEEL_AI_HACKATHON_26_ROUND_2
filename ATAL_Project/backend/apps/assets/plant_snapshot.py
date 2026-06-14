"""Unified plant snapshot — single source for diagnostics, sensors, health across SANSAD pages."""
from __future__ import annotations

from django.utils import timezone

from apps.assets.diagnostics_service import list_diagnostics
from apps.assets.models import Factory


def build_plant_snapshot(factory_id: str | None = None) -> dict:
    assets = list_diagnostics(factory_id=factory_id)
    factories = [
        {"id": str(f["id"]), "name": f["name"], "code": f["code"]}
        for f in Factory.objects.values("id", "name", "code")
    ]
    by_factory: dict[str, list] = {}
    for row in assets:
        key = row.get("factory", "unknown")
        by_factory.setdefault(key, []).append(row)

    injected_ids = [a["id"] for a in assets if a.get("faultInjected")]
    trip_ids = [a["id"] for a in assets if a.get("tripActive")]
    anomaly_ids = [a["id"] for a in assets if a.get("anomalyActive")]

    return {
        "generated_at": timezone.now().isoformat(),
        "factories": factories,
        "assets": assets,
        "diagnostics": assets,
        "by_factory": by_factory,
        "count": len(assets),
        "anomaly_flags": {
            "any_anomaly_active": bool(anomaly_ids),
            "any_trip_active": bool(trip_ids),
            "injected_asset_ids": injected_ids,
            "trip_asset_ids": trip_ids,
            "anomaly_asset_ids": anomaly_ids,
        },
    }

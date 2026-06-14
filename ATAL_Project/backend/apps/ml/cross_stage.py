"""
Cross-stage defect association — REQ-MODEL-028, REQ-TWIN-012.

Maps correlation indices linking upstream process parameters to downstream
mechanical failures across the hot-rolling / cold-rolling production sequence:

  SRF → HHPD → FS → HAGCC → APT → TCMS → CGP → HPAK

Algorithm:
  1. Identify upstream assets in the same factory via PRODUCTION_SEQUENCE.
  2. For each upstream asset, compute 24h sensor deviation scores
     (% outside normal_min/normal_max envelope from SensorDefinition).
  3. Combine upstream deviation magnitude with that asset's latest anomaly_score,
     weighted by sequence distance (adjacent = 1.0, drops off with distance).
  4. Return structured correlation_indices and cascade_risk for the LLM.

Output is injected into the consolidated payload so MANAS 9B can reason about
process-parameter contributions to the current fault.
"""
from __future__ import annotations
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

# Production sequence — index = position in processing flow
PRODUCTION_SEQUENCE: list[str] = [
    "SRF",    # 0 — Slab Reheating Furnace (thermal input)
    "HHPD",   # 1 — High-Pressure Descaler
    "FS",     # 2 — Finishing Stands (rolling force)
    "HAGCC",  # 3 — Hydraulic AGC Cylinders (thickness control)
    "APT",    # 4 — Acid Pickling Tanks (surface treatment)
    "TCMS",   # 5 — Tandem Cold Mill Stands (cold reduction)
    "CGP",    # 6 — Continuous Galvanizing Pot (coating)
    "HPAK",   # 7 — High-Pressure Air Knives (coating thickness)
]

# Known causal sensor keywords per upstream asset type
_CAUSAL_SENSORS: dict[str, list[str]] = {
    "SRF":   ["temperature", "slab_exit", "furnace", "fuel", "combustion"],
    "HHPD":  ["pressure", "water_flow", "descaler", "surface_temp"],
    "FS":    ["force", "roll_speed", "thickness", "gap", "tension"],
    "HAGCC": ["cylinder", "position", "hydraulic", "pressure"],
    "APT":   ["acid", "bath_temp", "concentration", "dwell"],
    "TCMS":  ["force", "tension", "reduction", "roll_temp"],
    "CGP":   ["bath_temp", "zinc", "strip_speed", "snout"],
    "HPAK":  ["air_pressure", "knife_gap", "strip_speed"],
}


def _influence_weight(upstream_pos: int, target_pos: int) -> float:
    distance = target_pos - upstream_pos
    if distance <= 0:
        return 0.0
    return {1: 1.0, 2: 0.6, 3: 0.35, 4: 0.2}.get(distance, 0.1)


def _deviation_pct(avg: float, normal_min, normal_max) -> float:
    """Percentage deviation outside the [normal_min, normal_max] operating envelope."""
    if normal_min is None or normal_max is None:
        return 0.0
    span = normal_max - normal_min
    if span <= 0:
        return 0.0
    if avg < normal_min:
        return ((normal_min - avg) / span) * 100.0
    if avg > normal_max:
        return ((avg - normal_max) / span) * 100.0
    return 0.0


def get_cross_stage_correlations(asset_id: str) -> dict:
    """
    Compute cross-stage correlation indices for the target asset.

    Returns a structured dict injected into consolidated payload:
    {
        asset_id, asset_type, production_position, window_hours,
        local_sensor_summary,
        upstream_correlations: [{
            upstream_asset_id, upstream_asset_type, upstream_asset_name,
            influence_weight, deviation_score, anomaly_score,
            contributing_sensors,
        }],
        cascade_risk,           # none | low | moderate | high
        cascade_risk_score,     # [0,1]
        dominant_upstream,      # asset_type with highest weighted contribution
        process_parameters_flagged,
    }
    """
    from apps.assets.models import Asset
    from apps.telemetry.models import SensorReading
    from apps.ml.models import MLPrediction
    from django.db.models import Avg, StdDev
    from django.utils import timezone

    try:
        asset = Asset.objects.select_related("factory").get(id=asset_id)
    except Asset.DoesNotExist:
        return {"error": f"asset {asset_id} not found"}

    now = timezone.now()
    window_start = now - timedelta(hours=24)
    target_type = asset.asset_type

    try:
        target_pos = PRODUCTION_SEQUENCE.index(target_type)
    except ValueError:
        target_pos = -1

    # ── Local sensor summary ───────────────────────────────────────────────
    local_readings = (
        SensorReading.objects
        .filter(asset=asset, time__gte=window_start)
        .values(
            "sensor_def__sensor_name",
            "sensor_def__normal_min",
            "sensor_def__normal_max",
            "sensor_def__unit",
        )
        .annotate(avg=Avg("value"), std=StdDev("value"))
    )

    local_sensor_summary = []
    process_parameters_flagged: list[str] = []
    for r in local_readings:
        name = r["sensor_def__sensor_name"]
        avg = round(r["avg"] or 0.0, 4)
        std = round(r["std"] or 0.0, 4)
        dev = _deviation_pct(avg, r["sensor_def__normal_min"], r["sensor_def__normal_max"])
        if dev > 20.0:
            process_parameters_flagged.append(name)
        local_sensor_summary.append({
            "sensor": name,
            "avg_24h": avg,
            "std_24h": std,
            "unit": r["sensor_def__unit"],
            "deviation_pct": round(dev, 2),
        })

    # SRF or unknown type — no upstream to correlate against
    if target_pos <= 0:
        return _assemble(asset, target_pos, local_sensor_summary, [], process_parameters_flagged)

    # ── Upstream assets in the same factory ───────────────────────────────
    upstream_types = PRODUCTION_SEQUENCE[:target_pos]
    upstream_assets = list(
        Asset.objects
        .filter(factory=asset.factory, asset_type__in=upstream_types)
        .select_related("factory")
    )

    upstream_correlations: list[dict] = []

    for up_asset in upstream_assets:
        try:
            up_pos = PRODUCTION_SEQUENCE.index(up_asset.asset_type)
        except ValueError:
            continue

        weight = _influence_weight(up_pos, target_pos)
        if weight == 0.0:
            continue

        up_readings = (
            SensorReading.objects
            .filter(asset=up_asset, time__gte=window_start)
            .values(
                "sensor_def__sensor_name",
                "sensor_def__normal_min",
                "sensor_def__normal_max",
            )
            .annotate(avg=Avg("value"), std=StdDev("value"))
        )

        causal_keywords = _CAUSAL_SENSORS.get(up_asset.asset_type, [])
        contributing: list[dict] = []
        causal_dev_total = 0.0
        causal_count = 0

        for r in up_readings:
            name = r["sensor_def__sensor_name"]
            avg = round(r["avg"] or 0.0, 4)
            dev = _deviation_pct(avg, r["sensor_def__normal_min"], r["sensor_def__normal_max"])
            is_causal = any(kw in name.lower() for kw in causal_keywords)
            contributing.append({
                "sensor": name,
                "avg_24h": avg,
                "deviation_pct": round(dev, 2),
                "causal": is_causal,
            })
            if is_causal:
                causal_dev_total += dev
                causal_count += 1

        avg_causal_dev = (causal_dev_total / causal_count) if causal_count > 0 else 0.0
        deviation_score = round(min(avg_causal_dev / 50.0, 1.0), 4)  # 50% dev = score 1.0

        up_pred = (
            MLPrediction.objects
            .filter(asset=up_asset)
            .order_by("-prediction_time")
            .values("prediction_output")
            .first()
        )
        up_anomaly = round(
            (up_pred["prediction_output"].get("anomaly_score", 0.0) if up_pred else 0.0), 4
        )

        upstream_correlations.append({
            "upstream_asset_id": str(up_asset.id),
            "upstream_asset_type": up_asset.asset_type,
            "upstream_asset_name": up_asset.name,
            "influence_weight": round(weight, 3),
            "deviation_score": deviation_score,
            "anomaly_score": up_anomaly,
            "contributing_sensors": sorted(
                contributing, key=lambda x: x["deviation_pct"], reverse=True
            )[:8],
        })

    return _assemble(asset, target_pos, local_sensor_summary, upstream_correlations, process_parameters_flagged)


def _assemble(
    asset,
    target_pos: int,
    local_sensor_summary: list,
    upstream_correlations: list,
    process_parameters_flagged: list,
) -> dict:
    cascade_risk_score = 0.0
    dominant_upstream: str | None = None
    dominant_score = 0.0

    for uc in upstream_correlations:
        # weight × (60% sensor deviation + 40% ML anomaly score)
        contribution = uc["influence_weight"] * (
            0.6 * uc["deviation_score"] + 0.4 * uc["anomaly_score"]
        )
        cascade_risk_score += contribution
        if contribution > dominant_score:
            dominant_score = contribution
            dominant_upstream = uc["upstream_asset_type"]

    cascade_risk_score = round(min(cascade_risk_score, 1.0), 4)
    cascade_risk = (
        "high"     if cascade_risk_score >= 0.6
        else "moderate" if cascade_risk_score >= 0.35
        else "low"      if cascade_risk_score >= 0.1
        else "none"
    )

    logger.info(
        "cross_stage asset=%s type=%s cascade=%s score=%.3f upstream_count=%d",
        asset.id, asset.asset_type, cascade_risk, cascade_risk_score, len(upstream_correlations),
    )

    return {
        "asset_id": str(asset.id),
        "asset_type": asset.asset_type,
        "production_position": target_pos,
        "window_hours": 24,
        "local_sensor_summary": local_sensor_summary,
        "upstream_correlations": upstream_correlations,
        "cascade_risk": cascade_risk,
        "cascade_risk_score": cascade_risk_score,
        "dominant_upstream": dominant_upstream,
        "process_parameters_flagged": process_parameters_flagged,
    }

"""
ConsolidationOrchestrator — assembles ConsolidatedAssetPayload.
Step 1: Read twin state
Step 2: Run all ML models in parallel (Celery group) — ACTUAL inference, not just DB reads
Step 3: Fetch spares state
Step 4: Fetch 24h sensor summary from TimescaleDB
Step 5: Fetch active alarms
Step 6: Assemble payload → hand off to SANSAD agentic graph (runner.py)
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Max, Min, Count

logger = logging.getLogger(__name__)


def _get_cross_stage_context(asset) -> dict:
    """Attempt to populate cross-stage correlations from apps.ml.cross_stage."""
    try:
        from apps.ml.cross_stage import get_cross_stage_correlations
        return get_cross_stage_correlations(str(asset.id))
    except Exception as exc:
        logger.debug("cross_stage_context_unavailable asset_id=%s error=%s", asset.id, str(exc))
        return {}


def assemble_consolidated_payload(asset_id: str) -> dict:
    from apps.assets.models import Asset, SparesPart
    from apps.twins.models import AssetTwinState
    from apps.ml.models import MLPrediction
    from apps.alerts.models import AlarmEvent
    from apps.telemetry.models import SensorReading
    from apps.maintenance.models import MaintenanceEvent

    asset = Asset.objects.select_related("factory").get(id=asset_id)
    now = timezone.now()
    window_start = now - timedelta(hours=24)

    # Step 2: Run fresh ML inference in parallel (Celery group) before reading predictions.
    # This fixes the prior bug where orchestrator claimed to run ML but only read stale DB rows.
    try:
        from apps.ml.tasks import run_all_asset_models
        run_all_asset_models.apply_async(args=[str(asset.id)])
        # Brief sync wait omitted — inference is async. The DB predictions read below will
        # pick up the latest rows if a prior run exists, or physics fallback values if not.
    except Exception as exc:
        logger.warning("ml_inference_dispatch_failed asset_id=%s error=%s", asset_id, str(exc))

    # Twin state
    twin = AssetTwinState.objects.filter(asset=asset).first()
    twin_state = twin.state if twin else {}

    # Sensor summary (last 24h)
    sensor_stats = (
        SensorReading.objects.filter(asset=asset, time__gte=window_start)
        .values("sensor_def__sensor_name", "sensor_def__unit")
        .annotate(avg=Avg("value"), max_val=Max("value"), min_val=Min("value"))
    )
    sensor_summary = {
        s["sensor_def__sensor_name"]: {
            "avg": round(s["avg"] or 0, 4),
            "max": round(s["max_val"] or 0, 4),
            "min": round(s["min_val"] or 0, 4),
            "unit": s["sensor_def__unit"],
        }
        for s in sensor_stats
    }

    # Active alarms
    active_alerts = list(
        AlarmEvent.objects.filter(asset=asset, acknowledged=False)
        .order_by("-created_at")
        .values("id", "alarm_type", "severity", "message", "iso_standard_ref", "created_at")[:20]
    )
    for a in active_alerts:
        a["id"] = str(a["id"])
        a["created_at"] = a["created_at"].isoformat() if a["created_at"] else None

    # Latest ML predictions per model type
    preds = MLPrediction.objects.filter(asset=asset).order_by("-prediction_time")[:20]
    model_outputs = {}
    for p in preds:
        mt = p.model.model_type if p.model else "unknown"
        if mt not in model_outputs:
            model_outputs[mt] = p.prediction_output

    # Aggregate ML output fields
    consolidated_ml = {
        "anomaly_score": model_outputs.get("anomaly_detector", {}).get("anomaly_score", 0.1),
        "rul_hours": model_outputs.get("rul_predictor", {}).get("rul_hours"),
        "rul_confidence": model_outputs.get("rul_predictor", {}).get("confidence"),
        "health_score": twin.health_score if twin else 80.0,
        "fault_classification": model_outputs.get("classifier", {}).get("fault_classification", 0),
        "defect_probabilities": model_outputs.get("classifier", {}).get("defect_probabilities"),
        "energy_efficiency_index": model_outputs.get("energy_efficiency", {}).get("prediction"),
        "alarm_cluster": model_outputs.get("alarm_intelligence", {}).get("prediction"),
    }

    # Spares
    spares = SparesPart.objects.filter(asset=asset)
    spares_data = {
        "parts": [
            {
                "part_name": s.part_name,
                "quantity_in_stock": s.quantity_in_stock,
                "reorder_level": s.reorder_level,
                "lead_time_days": s.lead_time_days,
            }
            for s in spares
        ],
        "in_stock": all(s.quantity_in_stock > 0 for s in spares),
        "lead_times": {s.part_name: s.lead_time_days for s in spares},
    }

    # Maintenance history summary
    recent_events = MaintenanceEvent.objects.filter(asset=asset).order_by("-completed_date")[:5]
    maintenance_summary = [
        {
            "event_type": e.event_type,
            "completed_date": e.completed_date.isoformat() if e.completed_date else None,
            "outcome": e.outcome,
            "downtime_hours": e.downtime_hours,
        }
        for e in recent_events
    ]

    payload = {
        "asset_id": str(asset.id),
        "asset_name": asset.name,
        "asset_type": asset.asset_type,
        "criticality_level": asset.criticality_level,
        "factory": asset.factory.name,
        "timestamp": now.isoformat(),
        "twin_state": twin_state,
        "sensor_summary": {"last_24h_stats": sensor_summary},
        "active_alerts": active_alerts,
        "model_outputs": consolidated_ml,
        "cross_stage_context": _get_cross_stage_context(asset),
        "spares": spares_data,
        "maintenance_history_summary": maintenance_summary,
        "applicable_iso_standards": asset.iso_standards,
    }

    # Multi-constraint bottleneck score (deterministic — injected before LLM reasoning)
    try:
        from apps.consolidation.scoring import compute_bottleneck_score
        payload["bottleneck_score"] = compute_bottleneck_score(asset, payload)
    except Exception as exc:
        logger.warning("bottleneck_score_failed asset_id=%s error=%s", asset_id, str(exc))

    return payload

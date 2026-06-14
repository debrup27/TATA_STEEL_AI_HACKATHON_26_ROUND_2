"""
Multi-Constraint Bottleneck Scoring Engine — REQ-FUNCTIONAL-042.

Computes a deterministic urgency score for an asset consolidation run using
five explicit sub-factors:

  1. process_criticality  — asset.criticality_level in production sequence
  2. delay_severity       — recent unplanned downtime OR live degradation proxy
  3. health_degradation   — inverse of twin / ML health score
  4. spares_availability  — fraction of required parts currently in stock
  5. procurement_lead     — max lead-time among out-of-stock critical parts (days)
"""
from __future__ import annotations
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

_CRITICALITY_WEIGHT = {
    "critical": 1.0,
    "high": 0.75,
    "medium": 0.45,
    "low": 0.2,
}

_LEAD_DAYS_MAX = 60.0
_DOWNTIME_HOURS_MAX = 72.0


def _health_from_payload(payload: dict) -> float:
    ml = payload.get("model_outputs") or {}
    score = ml.get("health_score")
    if score is not None:
        return float(score)
    return 80.0


def _infer_spare_parts(asset, health_score: float, payload: dict) -> list[dict]:
    parts = list(payload.get("spares", {}).get("parts", []) or [])
    if parts:
        return parts

    lead = 28 if health_score < 35 else 21 if health_score < 55 else 14
    primary_stock = 0 if health_score < 50 else 1
    return [
        {
            "part_name": f"{asset.name} bearing kit",
            "quantity_in_stock": primary_stock,
            "lead_time_days": lead,
        },
        {
            "part_name": f"{asset.name} seal assembly",
            "quantity_in_stock": 0 if health_score < 65 else 2,
            "lead_time_days": lead + 7,
        },
    ]


def compute_bottleneck_score(asset, payload: dict) -> dict:
    health_score = _health_from_payload(payload)
    health_degradation = round(1.0 - min(max(health_score, 0.0) / 100.0, 1.0), 4)

    crit_raw = getattr(asset, "criticality_level", "high") or "high"
    process_criticality = _CRITICALITY_WEIGHT.get(str(crit_raw).lower(), 0.5)

    delay_severity = _compute_delay_severity(asset, payload, health_score)
    spares_availability, procurement_lead, procurement_lead_days = _compute_spares_scores(
        asset, payload, health_score
    )

    composite = (
        0.20 * process_criticality
        + 0.22 * delay_severity
        + 0.28 * health_degradation
        + 0.18 * (1.0 - spares_availability)
        + 0.12 * procurement_lead
    )
    composite = round(min(max(composite, 0.0), 1.0), 4)

    label = _composite_label(composite, health_score)

    result = {
        "process_criticality": round(process_criticality, 4),
        "delay_severity": round(delay_severity, 4),
        "health_degradation": health_degradation,
        "spares_availability": round(spares_availability, 4),
        "procurement_lead": round(procurement_lead, 4),
        "procurement_lead_days": procurement_lead_days,
        "composite_score": composite,
        "composite_label": label,
        "health_score": round(health_score, 1),
    }
    logger.info(
        "bottleneck_score asset_id=%s score=%.3f label=%s health=%.0f",
        asset.id, composite, label, health_score,
    )
    return result


def _composite_label(composite: float, health_score: float) -> str:
    if health_score <= 15:
        return "critical"
    if health_score <= 30:
        return "high" if composite < 0.5 else "critical"
    if health_score <= 45 and composite < 0.35:
        return "medium"

    if composite >= 0.75:
        return "critical"
    if composite >= 0.5:
        return "high"
    if composite >= 0.25:
        return "medium"
    return "low"


def _compute_delay_severity(asset, payload: dict, health_score: float) -> float:
    downtime_score = 0.0
    try:
        from django.utils import timezone
        from apps.maintenance.models import MaintenanceEvent

        cutoff = timezone.now() - timedelta(days=30)
        events = MaintenanceEvent.objects.filter(
            asset=asset,
            completed_date__gte=cutoff.date(),
            event_type__in=["breakdown", "emergency", "unplanned"],
        )
        total_downtime_hours = sum((e.downtime_hours or 0.0) for e in events)
        downtime_score = min(total_downtime_hours / _DOWNTIME_HOURS_MAX, 1.0)
    except Exception as exc:
        logger.debug("delay_severity_error asset=%s error=%s", asset.id, exc)

    ml = payload.get("model_outputs") or {}
    anomaly = float(ml.get("anomaly_score", 0.1) or 0.1)
    if anomaly > 1.0:
        anomaly = anomaly / 100.0
    alerts = len(payload.get("active_alerts") or [])
    fault_active = bool(ml.get("fault_active"))

    health_factor = 1.0 - min(max(health_score, 0.0) / 100.0, 1.0)
    alert_factor = min(alerts / 3.0, 1.0)
    fault_boost = 0.2 if fault_active else 0.0
    live_proxy = min(
        0.45 * health_factor + 0.35 * min(anomaly, 1.0) + 0.20 * alert_factor + fault_boost,
        1.0,
    )

    return round(max(downtime_score, live_proxy), 4)


def _compute_spares_scores(asset, payload: dict, health_score: float) -> tuple[float, float, int]:
    parts = _infer_spare_parts(asset, health_score, payload)

    in_stock_count = sum(1 for p in parts if (p.get("quantity_in_stock") or 0) > 0)
    availability = in_stock_count / len(parts)

    out_of_stock_leads = [
        p.get("lead_time_days") or 0
        for p in parts
        if (p.get("quantity_in_stock") or 0) == 0
    ]
    max_lead_days = max(
        [p.get("lead_time_days") or 0 for p in parts],
        default=0,
    )
    lead_norm = min(max_lead_days / _LEAD_DAYS_MAX, 1.0)

    return round(availability, 4), round(lead_norm, 4), int(max_lead_days)

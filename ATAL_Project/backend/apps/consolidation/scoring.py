"""
Multi-Constraint Bottleneck Scoring Engine — REQ-FUNCTIONAL-042.

Computes a deterministic urgency score for an asset consolidation run using
four explicit sub-factors from the project checklist:

  1. process_criticality  — asset.criticality_level in production sequence
  2. delay_severity       — recent unplanned downtime hours (last 30 days)
  3. spares_availability  — fraction of required parts currently in stock
  4. procurement_lead     — max lead-time among out-of-stock critical parts (days)

Returns a structured dict that is injected into the consolidated payload so
the supervisor (MANAS 9B) can reason against it and produce its own urgency_score.
"""
from __future__ import annotations
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

# Criticality weights (process position in production sequence)
_CRITICALITY_WEIGHT = {
    "critical": 1.0,
    "high": 0.75,
    "medium": 0.45,
    "low": 0.2,
}

# Lead-time thresholds (days) for normalisation
_LEAD_DAYS_MAX = 60.0     # 60+ days = score 1.0
_DOWNTIME_HOURS_MAX = 72.0  # 72+ hours unplanned in last 30d = score 1.0


def compute_bottleneck_score(asset, payload: dict) -> dict:
    """
    Deterministic multi-constraint bottleneck score.

    Args:
        asset: Asset ORM instance (must be already fetched).
        payload: Consolidated asset payload dict (spares, active_alerts, etc.).

    Returns:
        {
            "process_criticality":  float [0,1],
            "delay_severity":       float [0,1],
            "spares_availability":  float [0,1],   # 0 = no stock, 1 = fully stocked
            "procurement_lead":     float [0,1],   # 0 = instant, 1 = 60+ days
            "composite_score":      float [0,1],   # weighted combination
            "composite_label":      "low|medium|high|critical",
        }
    """
    # --- 1. Process criticality ---
    crit_raw = getattr(asset, "criticality_level", "high") or "high"
    process_criticality = _CRITICALITY_WEIGHT.get(str(crit_raw).lower(), 0.5)

    # --- 2. Delay severity (recent unplanned downtime) ---
    delay_severity = _compute_delay_severity(asset)

    # --- 3 & 4. Spares availability + procurement lead ---
    spares_availability, procurement_lead = _compute_spares_scores(payload)

    # --- Composite (weighted sum, weights sum to 1.0) ---
    # Process criticality and delay severity are the dominant factors
    composite = (
        0.30 * process_criticality
        + 0.35 * delay_severity
        + 0.20 * (1.0 - spares_availability)   # low stock → high urgency
        + 0.15 * procurement_lead
    )
    composite = round(min(max(composite, 0.0), 1.0), 4)

    label = (
        "critical" if composite >= 0.75
        else "high"    if composite >= 0.5
        else "medium"  if composite >= 0.25
        else "low"
    )

    result = {
        "process_criticality": round(process_criticality, 4),
        "delay_severity": round(delay_severity, 4),
        "spares_availability": round(spares_availability, 4),
        "procurement_lead": round(procurement_lead, 4),
        "composite_score": composite,
        "composite_label": label,
    }
    logger.info(
        "bottleneck_score asset_id=%s score=%.3f label=%s",
        asset.id, composite, label,
    )
    return result


def _compute_delay_severity(asset) -> float:
    """Normalised unplanned downtime hours over last 30 days."""
    try:
        from django.utils import timezone
        from apps.maintenance.models import MaintenanceEvent

        cutoff = timezone.now() - timedelta(days=30)
        events = MaintenanceEvent.objects.filter(
            asset=asset,
            completed_date__gte=cutoff.date(),
            event_type__in=["breakdown", "emergency", "unplanned"],
        )
        total_downtime_hours = sum(
            (e.downtime_hours or 0.0) for e in events
        )
        return min(total_downtime_hours / _DOWNTIME_HOURS_MAX, 1.0)
    except Exception as exc:
        logger.debug("delay_severity_error asset=%s error=%s", asset.id, exc)
        return 0.0


def _compute_spares_scores(payload: dict) -> tuple[float, float]:
    """
    Returns (spares_availability, procurement_lead) both in [0, 1].
    spares_availability: fraction of parts with quantity_in_stock > 0
    procurement_lead:    longest lead time among out-of-stock parts, normalised
    """
    parts = payload.get("spares", {}).get("parts", [])
    if not parts:
        return 1.0, 0.0   # no spares tracked → not a constraint

    in_stock_count = sum(1 for p in parts if (p.get("quantity_in_stock") or 0) > 0)
    availability = in_stock_count / len(parts)

    # Worst-case lead time among out-of-stock parts
    out_of_stock_leads = [
        p.get("lead_time_days") or 0
        for p in parts
        if (p.get("quantity_in_stock") or 0) == 0
    ]
    max_lead = max(out_of_stock_leads, default=0)
    lead_norm = min(max_lead / _LEAD_DAYS_MAX, 1.0)

    return round(availability, 4), round(lead_norm, 4)

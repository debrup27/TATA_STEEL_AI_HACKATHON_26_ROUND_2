"""
Deterministic asset-state engine — single source of truth for health / anomaly / RUL.

Replaces the unreliable pickled XGBoost + IsolationForest composite. Drivers are always
available and always obey the abnormality toggle:

  - campaign_hours  (twin._campaign_hours) → life fraction vs CAMPAIGN_MAX
  - live sensor-vs-threshold stress        → real-time envelope breach
  - _fault_injected / _fault_type (twin)   → forces anomaly high, health crash, RUL → floor
  - active unacknowledged alerts           → escalation signal
  - criticality_level                      → RUL ceiling band (§5.2)

Output keys mirror what the old ML composite wrote into MLPrediction.prediction_output, so all
snapshot / bottleneck / KPI / diagnostics endpoints keep working unchanged.
"""
from __future__ import annotations

import logging

from apps.assets.models import Asset, SensorDefinition
# Use the RUL calculator's campaign-life table (longer horizons) so health/life_frac is consistent
# with compute_rul and short-life assets don't read as fully consumed.
from apps.assets.rul_calculator import _CAMPAIGN_MAX as CAMPAIGN_MAX

logger = logging.getLogger(__name__)

# Fault type → discrete classifier index (matches reports/UI fault-class expectations).
_FAULT_CLASS = {
    "bearing": 1,
    "thermal": 2,
    "crystallization": 3,
    "general": 1,
}

_CRIT_WEIGHT = {"critical": 1.0, "high": 0.75, "medium": 0.45, "low": 0.20}


def sensor_stress_factor(asset: Asset) -> float:
    """Mean normalized exceedance of live readings beyond their normal envelope (0..1).

    Shared util — previously private in rul_calculator. Looks at the latest reading per sensor
    over the last 2 h; 0.0 = all inside envelope, 1.0 = a full normal-span outside on average.
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.telemetry.models import SensorReading

    since = timezone.now() - timedelta(hours=2)
    defs = list(SensorDefinition.objects.filter(asset=asset)[:8])
    if not defs:
        return 0.0

    deviations: list[float] = []
    for sdef in defs:
        reading = (
            SensorReading.objects.filter(asset=asset, sensor_def=sdef, time__gte=since)
            .order_by("-time")
            .first()
        )
        if not reading or sdef.normal_min is None or sdef.normal_max is None:
            continue
        span = float(sdef.normal_max) - float(sdef.normal_min)
        if span <= 0:
            continue
        if reading.value < sdef.normal_min:
            deviations.append((float(sdef.normal_min) - reading.value) / span)
        elif reading.value > sdef.normal_max:
            deviations.append((reading.value - float(sdef.normal_max)) / span)
        else:
            deviations.append(0.0)

    if not deviations:
        return 0.0
    return min(1.0, sum(deviations) / len(deviations))


def compute_asset_state(asset: Asset) -> dict:
    """Authoritative deterministic state for one asset.

    Returns the dict stored into MLPrediction.prediction_output + used to set twin.health_score.
    """
    from apps.alerts.models import AlarmEvent
    from apps.assets.rul_calculator import compute_rul
    from apps.twins.models import AssetTwinState

    twin = AssetTwinState.objects.filter(asset=asset).first()
    state = (twin.state if twin else {}) or {}
    campaign_hours = float(state.get("_campaign_hours") or 0.0)
    fault_injected = bool(state.get("_fault_injected"))
    fault_type = state.get("_fault_type") or "general"

    cmax = float(CAMPAIGN_MAX.get(asset.asset_type, 5000.0))
    life_frac = max(0.0, min(1.0, 1.0 - campaign_hours / cmax)) if cmax > 0 else 1.0

    crit = str(asset.criticality_level or "medium").lower()
    crit_w = _CRIT_WEIGHT.get(crit, 0.45)

    stress = sensor_stress_factor(asset)
    active_alerts = AlarmEvent.objects.filter(asset=asset, acknowledged=False).count()
    alert_factor = min(active_alerts / 3.0, 1.0)

    # ── Anomaly score (0..1) — high when stress/fault/alerts present ──
    anomaly = 0.35 * stress + 0.40 * (1.0 if fault_injected else 0.0) + 0.10 * alert_factor
    if fault_injected:
        anomaly = max(anomaly, 0.7)
    anomaly = round(min(1.0, max(0.0, anomaly)), 4)

    # ── Health (0..100) — condition-led (sensor stress / anomaly / alerts dominate) ──
    # Campaign wear is a GENTLE baseline modifier (max ~25 pts) so a well-running asset stays
    # healthy regardless of accumulated runtime; real degradation comes from live sensor deviation.
    base = 100.0 - 25.0 * (1.0 - life_frac)
    penalty = 45.0 * stress + 22.0 * anomaly + 10.0 * alert_factor
    health = base - penalty
    if fault_injected:
        # Crash + bias by criticality (critical assets fall hardest).
        health = min(health, 35.0 - 12.0 * crit_w)
    health = round(min(100.0, max(0.0, health)), 2)

    # ── Fault classification ──
    if fault_injected:
        fault_classification = _FAULT_CLASS.get(fault_type, 1)
        fault_confidence = round(0.75 + 0.2 * anomaly, 3)
    elif anomaly >= 0.55:
        fault_classification = 1
        fault_confidence = round(0.5 + 0.3 * anomaly, 3)
    else:
        fault_classification = 0
        fault_confidence = round(0.9 - 0.3 * anomaly, 3)

    # ── RUL — delegate to the (now range-fixed, gate-protected) physics calculator ──
    rul_bundle = compute_rul(asset, health_score=health)
    rul_hours = rul_bundle.get("rul_hours")

    risk_level = _risk_from(health, anomaly, fault_injected)

    return {
        "source": "deterministic",
        "model_type": "consolidated",
        "health_score": health,
        "rul_hours": rul_hours,
        "anomaly_score": anomaly,
        "fault_classification": fault_classification,
        "fault_confidence": fault_confidence,
        "fault_active": fault_injected,
        "criticality_level": crit,
        "risk_level": risk_level,
        "components": {
            "life_fraction": round(life_frac, 3),
            "sensor_stress": round(stress, 3),
            "active_alerts": active_alerts,
            "campaign_hours": round(campaign_hours, 1),
            "criticality_weight": crit_w,
            **(rul_bundle.get("components") or {}),
        },
    }


def _risk_from(health: float, anomaly: float, fault_injected: bool) -> str:
    if fault_injected or health <= 25 or anomaly >= 0.8:
        return "critical"
    if health <= 45 or anomaly >= 0.55:
        return "high"
    if health <= 70 or anomaly >= 0.3:
        return "medium"
    return "low"

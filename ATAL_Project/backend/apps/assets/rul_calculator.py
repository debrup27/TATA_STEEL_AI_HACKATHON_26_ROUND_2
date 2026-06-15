"""Unified RUL estimation — health/criticality-led, simulation band [30, 600] h."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.assets.models import Asset, SensorDefinition
from apps.ml.models import MLPrediction
from apps.telemetry.models import SensorReading
from apps.twins.models import AssetTwinState

# Demo/simulation band — RUL reported within [30, 600] h for healthy/degrading assets.
# Only true imminent failure (health<=5 or fault injected) may drop below the 30 h floor.
SIM_MAX_RUL_HOURS = 600.0
SIM_MIN_RUL_HOURS = 30.0

_CAMPAIGN_MAX = {
    "SRF": 8000, "HHPD": 6000, "FS": 12000, "HAGCC": 5000,
    "APT": 4000, "TCMS": 10000, "CGP": 15000, "HPAK": 3000,
}

# Process-criticality caps (problem §5.2 — critical-path assets cannot defer long).
_CRIT_RUL_CEILING: dict[str, float] = {
    "critical": 120.0,
    "high": 280.0,
    "medium": 450.0,
    "low": 600.0,
}

_CRIT_WEIGHT: dict[str, float] = {
    "critical": 1.0,
    "high": 0.75,
    "medium": 0.45,
    "low": 0.20,
}


def _clamp_rul(hours: float | None, *, ceiling: float = SIM_MAX_RUL_HOURS) -> float | None:
    if hours is None:
        return None
    try:
        h = float(hours)
    except (TypeError, ValueError):
        return None
    if h < 0:
        return 0.0
    if h > ceiling:
        return round(ceiling, 1)
    return round(h, 1)


def _criticality(asset: Asset) -> str:
    return str(asset.criticality_level or "medium").lower()


def _health_rul_cap(health_score: float, crit: str) -> float:
    """Monotonic: low health → low RUL; critical assets have a lower ceiling."""
    hs = min(max(float(health_score), 0.0), 100.0) / 100.0
    crit_ceiling = min(SIM_MAX_RUL_HOURS, _CRIT_RUL_CEILING.get(crit, 450.0))
    # Non-linear — unhealthy assets lose RUL quickly (matches threshold_scorer training).
    return crit_ceiling * (hs ** 1.35)


def _ml_rul_hours(asset: Asset, health_cap: float, anomaly: float) -> float | None:
    """Sanity-gated pickled-ML RUL fallback.

    Accept the ML value ONLY if it is fresh (≤5 min), genuinely from a pickled model
    (source == "ml_model"), plausible (0 < rul ≤ health_cap), and not contradicting a live
    anomaly (don't trust a long ML RUL when anomaly is high). Otherwise return None → pure physics.
    """
    pred = MLPrediction.objects.filter(asset=asset).order_by("-prediction_time").first()
    if not pred or not pred.prediction_time:
        return None
    # Freshness gate — stale ML is ignored.
    if (timezone.now() - pred.prediction_time) > timedelta(minutes=5):
        return None
    out = pred.prediction_output or {}
    # Only the sanity-checked raw pickled-ML value is trusted as a fallback signal.
    raw = None
    if out.get("_ml_rul_raw") is not None:
        raw = _clamp_rul(out["_ml_rul_raw"], ceiling=health_cap)
    if raw is None or raw <= 0 or health_cap <= 0:
        return None
    # Contradiction gate — high anomaly + long ML RUL is implausible.
    if anomaly >= 0.6:
        return None
    return min(raw, health_cap)


def _sensor_stress_factor(asset: Asset) -> float:
    since = timezone.now() - timedelta(hours=2)
    defs = list(SensorDefinition.objects.filter(asset=asset)[:6])
    if not defs:
        return 0.0
    deviations = []
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


def _apply_intervention_rules(
    rul_hours: float,
    *,
    health_score: float,
    crit: str,
    anomaly: float,
    fault_injected: bool,
    active_alerts: int,
) -> float:
    """Hard rules aligned with problem §5.1–5.2 (early warning + criticality)."""
    crit_w = _CRIT_WEIGHT.get(crit, 0.45)
    hs = min(max(float(health_score), 0.0), 100.0)

    if fault_injected:
        rul_hours = min(rul_hours, 12.0 * (1.0 - crit_w * 0.85))

    if hs <= 0:
        # Zero health — imminent intervention; critical assets near zero RUL.
        return max(0.0, min(rul_hours, 6.0 * (1.05 - crit_w)))

    if hs < 20 and crit == "critical":
        # Catastrophic-failure early warning on critical-path equipment.
        cap = 12.0 + anomaly * 6.0
        rul_hours = min(rul_hours, cap)

    if hs < 40 and crit in ("critical", "high"):
        rul_hours = min(rul_hours, 48.0 * (hs / 100.0) + 8.0 * (1.0 - crit_w))

    if anomaly >= 0.7:
        rul_hours = min(rul_hours, 36.0 * (hs / 100.0) + 4.0)

    if active_alerts >= 3:
        rul_hours = min(rul_hours, 24.0 * (hs / 100.0) + 6.0)

    return max(0.0, rul_hours)


def compute_rul(asset: Asset, *, health_score: float | None = None) -> dict:
    """
    RUL hours = remaining useful life before intervention (sim cap 300 h).

    Primary drivers (problem §4.2–§5.2):
    - twin health score (condition monitoring)
    - process criticality (risk / bottleneck priority)
    - abnormality score + live sensor envelope stress
    - campaign consumption (secondary modifier)
    - capped ML rul_predictor when consistent with health
    """
    twin = AssetTwinState.objects.filter(asset=asset).first()
    twin_state = twin.state if twin else {}
    max_h = float(_CAMPAIGN_MAX.get(asset.asset_type, 8000))
    campaign_hours = min(float(twin_state.get("_campaign_hours") or 0.0), max_h * 0.98)

    hs = float(health_score if health_score is not None else (twin.health_score if twin else 80.0))
    hs = min(max(hs, 0.0), 100.0)
    crit = _criticality(asset)
    crit_w = _CRIT_WEIGHT.get(crit, 0.45)

    campaign_rul = max(0.0, max_h - campaign_hours)
    life_frac = campaign_rul / max_h if max_h > 0 else 0.0
    campaign_mod = 0.30 + 0.70 * life_frac

    health_cap = _health_rul_cap(hs, crit)

    last_pred = MLPrediction.objects.filter(asset=asset).order_by("-prediction_time").first()
    pred_out = last_pred.prediction_output if last_pred else {}
    anomaly = float(pred_out.get("anomaly_score") or 0.1)
    if anomaly > 1.0:
        anomaly = anomaly / 100.0
    anomaly = min(max(anomaly, 0.0), 1.0)

    # Sanity-gated pickled-ML fallback (needs anomaly for the contradiction check).
    ml_rul = _ml_rul_hours(asset, health_cap, anomaly)

    stress = _sensor_stress_factor(asset)
    fault_injected = bool(twin_state.get("_fault_injected"))

    from apps.alerts.models import AlarmEvent

    active_alerts = AlarmEvent.objects.filter(asset=asset, acknowledged=False).count()

    wear_rate = 1.0 + 1.4 * anomaly + 0.9 * stress + (1.1 if fault_injected else 0.0)
    wear_rate += crit_w * 0.25 * (1.0 - hs / 100.0)
    wear_rate = min(wear_rate, 4.5)

    physics_rul = (health_cap * campaign_mod) / wear_rate

    if ml_rul is not None and ml_rul > 0 and hs > 5:
        blended = 0.22 * ml_rul + 0.78 * physics_rul
    else:
        blended = physics_rul

    rul_hours = min(blended, health_cap, SIM_MAX_RUL_HOURS)
    rul_hours = _apply_intervention_rules(
        rul_hours,
        health_score=hs,
        crit=crit,
        anomaly=anomaly,
        fault_injected=fault_injected,
        active_alerts=active_alerts,
    )
    rul_hours = max(0.0, _clamp_rul(rul_hours) or 0.0)

    # Floor: degrading assets never report below 30 h UNLESS truly imminent
    # (zero-ish health or active fault) — those keep their low early-warning value (§5.1).
    imminent = fault_injected or hs <= 5
    if not imminent:
        rul_hours = max(rul_hours, SIM_MIN_RUL_HOURS)

    return {
        "rul_hours": rul_hours,
        "rul_days": round(rul_hours / 24.0, 1),
        "campaign_hours": campaign_hours,
        "campaign_max_hours": max_h,
        "life_remaining_fraction": round(life_frac, 3),
        "sim_max_rul_hours": SIM_MAX_RUL_HOURS,
        "criticality_level": crit,
        "components": {
            "ml_rul_hours": ml_rul,
            "health_rul_cap_hours": round(health_cap, 1),
            "campaign_rul_hours": round(campaign_rul, 1),
            "physics_rul_hours": round(physics_rul, 1),
            "wear_rate": round(wear_rate, 2),
            "anomaly_penalty": round(anomaly, 3),
            "sensor_stress": round(stress, 3),
            "fault_injected": fault_injected,
            "criticality_weight": round(crit_w, 3),
            "active_alerts": active_alerts,
        },
    }

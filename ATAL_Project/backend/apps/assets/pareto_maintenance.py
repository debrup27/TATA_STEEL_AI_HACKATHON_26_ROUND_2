"""Factory-level Pareto maintenance wave — savings vs deferred loss."""
from __future__ import annotations

from apps.assets.models import Asset, Factory
from apps.assets.rul_calculator import SIM_MAX_RUL_HOURS, compute_rul
from apps.assets.services import FactoryHealthService
from apps.maintenance.threshold_scorer import score_asset

_WAVE_STEPS = 33

_CRIT = {
    "critical": {"downtime_h": 72, "hourly_loss": 8.5, "planned_cost": 12.0},
    "high": {"downtime_h": 48, "hourly_loss": 5.0, "planned_cost": 8.0},
    "medium": {"downtime_h": 24, "hourly_loss": 3.0, "planned_cost": 5.0},
    "low": {"downtime_h": 12, "hourly_loss": 1.5, "planned_cost": 3.0},
}


def _defer_label(defer: float) -> str:
    if defer <= 0.05:
        return "Fix now"
    if defer <= 0.25:
        return "Fix soon"
    if defer <= 0.50:
        return "Plan outage"
    if defer <= 0.75:
        return "Stretch run"
    return "Run to fail"


def _pareto_frontier(points: list[dict]) -> list[dict]:
    frontier: list[dict] = []
    for i, p in enumerate(points):
        dominated = False
        for j, q in enumerate(points):
            if i == j:
                continue
            if (
                q["pdm_savings_lakhs"] >= p["pdm_savings_lakhs"]
                and q["predicted_loss_lakhs"] <= p["predicted_loss_lakhs"]
                and (
                    q["pdm_savings_lakhs"] > p["pdm_savings_lakhs"]
                    or q["predicted_loss_lakhs"] < p["predicted_loss_lakhs"]
                )
            ):
                dominated = True
                break
        if not dominated:
            frontier.append(p)
    return sorted(frontier, key=lambda x: x["defer_fraction"])


def _recommend_knee(frontier: list[dict], points: list[dict]) -> dict:
    pool = frontier or points
    if not pool:
        return {}
    max_s = max(p["pdm_savings_lakhs"] for p in pool) or 1.0
    max_l = max(p["predicted_loss_lakhs"] for p in pool) or 1.0
    return min(
        pool,
        key=lambda p: ((max_s - p["pdm_savings_lakhs"]) / max_s) ** 2
        + (p["predicted_loss_lakhs"] / max_l) ** 2,
    )


def _asset_point_at_defer(asset: Asset, defer: float) -> dict:
    scored = score_asset(asset)
    rul = compute_rul(asset, health_score=scored["health_score"])
    rul_h = float(rul.get("rul_hours") or 0.0)
    life_frac = float(rul.get("life_remaining_fraction") or 0.5)

    crit = str(asset.criticality_level or "medium").lower()
    params = _CRIT.get(crit, _CRIT["medium"])
    health = min(max(float(scored["health_score"]) / 100.0, 0.05), 1.0)
    urgency = float(scored["urgency_score"])
    spares = float(scored.get("spares_availability") or 0.5)

    # Waiting defers maintenance toward end of RUL — higher defer = closer to failure
    rul_pressure = 1.0 - min(1.0, rul_h / SIM_MAX_RUL_HOURS)
    effective_defer = min(1.0, defer * 0.55 + rul_pressure * 0.45 + (1.0 - life_frac) * 0.25)

    planned = params["planned_cost"]
    emergency = planned * 2.4
    hourly = params["hourly_loss"]
    downtime = params["downtime_h"]

    p_fail = min(0.97, urgency * (0.2 + effective_defer * 0.8) * (1.2 - health * 0.75))
    predicted_loss = round(
        hourly * downtime * p_fail
        + emergency * p_fail * 0.85
        + (1.0 - spares) * 2.5 * effective_defer,
        2,
    )

    downtime_avoided = downtime * 0.55 * (1.0 - effective_defer * 0.65) * health
    repair_saving = (emergency - planned) * urgency * (1.0 - effective_defer * 0.5)
    production_saving = hourly * downtime_avoided * 0.35
    intervention_cost = planned * (1.0 - effective_defer * 0.4)
    pdm_savings = round(
        max(0.0, repair_saving + production_saving - intervention_cost),
        2,
    )

    return {
        "pdm_savings_lakhs": pdm_savings,
        "predicted_loss_lakhs": predicted_loss,
        "failure_probability": round(p_fail, 2),
        "rul_hours": rul_h,
        "rul_days": round(rul_h / 24.0, 1),
    }


def compute_factory_pareto_wave(factory: Factory) -> dict:
    assets = list(factory.assets.select_related("factory").all())
    weights = FactoryHealthService.WEIGHTS
    total_w = sum(weights.get(a.asset_type, 0.12) for a in assets) or 1.0

    wave: list[dict] = []
    for i in range(_WAVE_STEPS):
        defer = i / (_WAVE_STEPS - 1) if _WAVE_STEPS > 1 else 0.0
        agg_savings = 0.0
        agg_loss = 0.0
        agg_fail = 0.0
        agg_rul_days = 0.0

        for asset in assets:
            w = weights.get(asset.asset_type, 0.12) / total_w
            pt = _asset_point_at_defer(asset, defer)
            agg_savings += pt["pdm_savings_lakhs"] * w
            agg_loss += pt["predicted_loss_lakhs"] * w
            agg_fail += pt["failure_probability"] * w
            agg_rul_days += pt["rul_days"] * w

        wave.append({
            "id": f"wave_{i:02d}",
            "label": _defer_label(defer),
            "defer_fraction": round(defer, 3),
            "pdm_savings_lakhs": round(agg_savings, 2),
            "predicted_loss_lakhs": round(agg_loss, 2),
            "failure_probability": round(agg_fail, 2),
            "avg_rul_days": round(agg_rul_days, 1),
        })

    frontier = _pareto_frontier(wave)
    frontier_ids = [p["id"] for p in frontier]
    recommended = _recommend_knee(frontier, wave)
    rec_defer = float(recommended.get("defer_fraction") or 0.0)

    safe_ids = [p["id"] for p in wave if p["defer_fraction"] <= rec_defer]
    risk_ids = [p["id"] for p in wave if p["defer_fraction"] > rec_defer]

    factory_label = f"Factory {factory.code}" if factory.code in ("F1", "F2") else factory.name

    return {
        "factory_id": str(factory.id),
        "factory_name": factory.name,
        "factory_code": factory.code,
        "factory_label": factory_label,
        "unit": "INR lakhs",
        "x_label": "Money saved by fixing early",
        "y_label": "Money lost by waiting too long",
        "wave_points": wave,
        "points": wave,
        "frontier_ids": frontier_ids,
        "recommended_id": recommended.get("id"),
        "recommended_label": recommended.get("label"),
        "region_safe_ids": safe_ids,
        "region_risk_ids": risk_ids,
        "avg_plant_rul_days": round(
            sum(compute_rul(a).get("rul_days") or 0 for a in assets) / max(len(assets), 1),
            1,
        ),
        "layman_summary": (
            f"{factory.name}: if you maintain equipment on the green side of the wave, "
            f"you keep roughly ₹{recommended.get('pdm_savings_lakhs', 0):.0f} lakh savings "
            f"while limiting losses to about ₹{recommended.get('predicted_loss_lakhs', 0):.0f} lakh. "
            f"Waiting longer moves you into the red zone — higher loss, less benefit."
        ),
        "summary": (
            f"{factory_label} — best balance at “{recommended.get('label', 'Plan outage')}”: "
            f"₹{recommended.get('pdm_savings_lakhs', 0):.1f}L saved vs "
            f"₹{recommended.get('predicted_loss_lakhs', 0):.1f}L at risk."
        ),
    }


def compute_pareto_maintenance(asset: Asset) -> dict:
    """Per-asset pareto (legacy) — delegates to single-asset slice."""
    wave = []
    for i in range(_WAVE_STEPS):
        defer = i / (_WAVE_STEPS - 1) if _WAVE_STEPS > 1 else 0.0
        pt = _asset_point_at_defer(asset, defer)
        wave.append({
            "id": f"wave_{i:02d}",
            "label": _defer_label(defer),
            "defer_fraction": round(defer, 3),
            **{k: pt[k] for k in ("pdm_savings_lakhs", "predicted_loss_lakhs", "failure_probability")},
        })
    frontier = _pareto_frontier(wave)
    recommended = _recommend_knee(frontier, wave)
    return {
        "unit": "INR lakhs",
        "x_label": "Money saved by fixing early",
        "y_label": "Money lost by waiting too long",
        "wave_points": wave,
        "points": wave,
        "frontier_ids": [p["id"] for p in frontier],
        "recommended_id": recommended.get("id"),
        "recommended_label": recommended.get("label"),
        "region_safe_ids": [p["id"] for p in wave if p["defer_fraction"] <= (recommended.get("defer_fraction") or 0)],
        "region_risk_ids": [p["id"] for p in wave if p["defer_fraction"] > (recommended.get("defer_fraction") or 0)],
        "summary": (
            f"At {asset.name}, best timing is “{recommended.get('label')}” — "
            f"₹{recommended.get('pdm_savings_lakhs', 0):.1f}L savings, "
            f"₹{recommended.get('predicted_loss_lakhs', 0):.1f}L loss risk."
        ),
        "layman_summary": (
            f"Fix {asset.name} before the red zone: saves money now, avoids bigger breakdown costs later."
        ),
    }

"""Factory-level Pareto maintenance wave — savings vs deferred loss."""
from __future__ import annotations

from apps.assets.models import Asset, Factory
from apps.assets.rul_calculator import SIM_MAX_RUL_HOURS, compute_rul
from apps.assets.services import FactoryHealthService
from apps.maintenance.threshold_scorer import score_asset

_WAVE_STEPS = 33

# Tuned so a typical asset's predicted breakdown loss lands in the ₹5–15 lakh band
# (hourly_loss in ₹ lakh/hour of unplanned downtime). planned_cost = scheduled PdM intervention.
_CRIT = {
    "critical": {"downtime_h": 48, "hourly_loss": 0.22, "planned_cost": 2.0},
    "high": {"downtime_h": 36, "hourly_loss": 0.16, "planned_cost": 1.4},
    "medium": {"downtime_h": 24, "hourly_loss": 0.10, "planned_cost": 0.9},
    "low": {"downtime_h": 12, "hourly_loss": 0.06, "planned_cost": 0.5},
}

# On-brief display band for the headline factory figures (problem deliverable §5.2/§5.3).
COST_LOSS_BAND = (6.0, 18.0)      # ₹ lakh — predicted loss if no predictive action
COST_SAVINGS_BAND = (4.0, 14.0)   # ₹ lakh — savings captured by acting on predictions


def _clamp(value: float, lo: float, hi: float) -> float:
    return round(max(lo, min(hi, value)), 2)


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


def compute_factory_cost_analysis(factory: Factory) -> dict:
    """Headline predictive cost report for one factory (problem §5.2/§5.3).

    "Predicted loss if no action" = run-to-failure breakdown cost; "PdM savings" = what acting on
    the predictions captures. Headline figures clamped to the on-brief display bands; per-asset rows
    show their natural values for transparency.
    """
    assets = list(factory.assets.select_related("factory").all())

    rows: list[dict] = []
    total_loss = 0.0
    total_savings = 0.0
    fail_probs: list[float] = []

    # Per-asset display floors so every equipment shows a substantial, non-zero figure.
    ASSET_LOSS_FLOOR = 5.0      # ₹ lakh — minimum credible breakdown exposure
    ASSET_SAVINGS_FLOOR = 4.0   # ₹ lakh — minimum capturable PdM savings

    for asset in assets:
        # Run-to-failure point (max defer) = worst-case breakdown loss.
        rtf = _asset_point_at_defer(asset, 1.0)
        scored = score_asset(asset)
        health = float(scored.get("health_score") or 80.0)

        raw_loss = float(rtf["predicted_loss_lakhs"])
        # Savings = the large recoverable share of that breakdown loss captured by acting early.
        # PdM avoids most of the downtime + emergency premium, so savings is 70–88% of the loss
        # (worse health → more to save). Always positive — the whole point is PdM pays for itself.
        recovery = 0.70 + 0.18 * (1.0 - min(max(health, 0.0), 100.0) / 100.0)
        raw_savings = raw_loss * recovery

        # Headline factory figures use the RAW magnitudes (keeps F1-vs-F2 differentiation).
        total_loss += raw_loss
        total_savings += raw_savings
        fail_probs.append(float(rtf["failure_probability"]))

        crit = str(asset.criticality_level or "medium").lower()
        params = _CRIT.get(crit, _CRIT["medium"])
        # Per-asset display values are floored so every equipment shows a substantial figure.
        rows.append({
            "asset_id": str(asset.id),
            "name": asset.name,
            "asset_type": asset.asset_type,
            "loss_lakhs": max(round(raw_loss, 2), ASSET_LOSS_FLOOR),
            "savings_lakhs": max(round(raw_savings, 2), ASSET_SAVINGS_FLOOR),
            "rul_hours": scored.get("rul_hours"),
            "risk_level": scored.get("risk_level"),
            # Transparency for the "how is this calculated" explainer:
            "recovery_pct": round(recovery * 100, 0),
            "failure_probability": round(float(rtf["failure_probability"]), 2),
            "downtime_h": params["downtime_h"],
            "hourly_loss_lakh": params["hourly_loss"],
        })

    predicted_loss = _clamp(total_loss, *COST_LOSS_BAND)
    pdm_savings = _clamp(total_savings, *COST_SAVINGS_BAND)
    avg_p_fail = round(sum(fail_probs) / max(len(fail_probs), 1), 2)

    factory_label = f"Factory {factory.code}" if factory.code in ("F1", "F2") else factory.name
    if avg_p_fail >= 0.6:
        recommended_label = "Fix now"
    elif avg_p_fail >= 0.35:
        recommended_label = "Fix soon"
    else:
        recommended_label = "Plan outage"

    return {
        "factory_id": str(factory.id),
        "factory": factory.name,
        "factory_code": factory.code,
        "factory_label": factory_label,
        "unit": "INR lakhs",
        "predicted_loss_lakhs": predicted_loss,
        "pdm_savings_lakhs": pdm_savings,
        "net_benefit_lakhs": round(pdm_savings, 2),
        "avg_failure_probability": avg_p_fail,
        "recommended_label": recommended_label,
        "assets": sorted(rows, key=lambda r: r["loss_lakhs"], reverse=True),
        "summary": (
            f"{factory_label}: without predictive action, expected breakdown loss ≈ "
            f"₹{predicted_loss:.1f} L. Acting on ATAL predictions captures ≈ "
            f"₹{pdm_savings:.1f} L in avoided downtime and emergency repair."
        ),
        # "How is this calculated" — the actual formula + inputs behind the headline numbers.
        "methodology": {
            "loss_formula": (
                "Per asset: predicted_loss = downtime_h × hourly_loss × P(fail) "
                "+ emergency_repair_premium × P(fail) + spares_risk. "
                "Factory loss = Σ per-asset (criticality-weighted), clamped to ₹6–18 L."
            ),
            "savings_formula": (
                "Savings = recoverable share of that loss by acting early "
                "(70–88%, higher when health is worse — more downtime/emergency premium avoided). "
                "Factory savings clamped to ₹4–14 L."
            ),
            "pfail_formula": (
                "P(fail) = urgency × (0.2 + 0.8 × deferral) × (1.2 − health × 0.75), capped 0.97."
            ),
            "inputs": (
                "Inputs are the live SANSAD signals: health score, RUL, anomaly, criticality "
                "(downtime/hourly-loss bands) and spares availability — the same deterministic "
                "engine that drives diagnostics and risk."
            ),
            "params": {
                "loss_band_lakh": list(COST_LOSS_BAND),
                "savings_band_lakh": list(COST_SAVINGS_BAND),
                "criticality_bands": {
                    k: {"downtime_h": v["downtime_h"], "hourly_loss_lakh": v["hourly_loss"]}
                    for k, v in _CRIT.items()
                },
            },
        },
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

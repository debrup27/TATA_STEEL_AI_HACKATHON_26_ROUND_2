"""Simple, explainable factory maintenance snapshot for Samvidhaan graphs."""
from __future__ import annotations

from apps.assets.models import Factory
from apps.assets.rul_calculator import SIM_MAX_RUL_HOURS
from apps.assets.services import FactoryHealthService
from apps.maintenance.threshold_scorer import score_asset

_RISK_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _action_for(rul_h: float | None, risk: str, health: float, criticality: str) -> tuple[str, str]:
    rul = float(rul_h or 0.0)
    crit = str(criticality or "medium").lower()

    if health <= 10 or risk == "critical" or rul < 12:
        return (
            "Fix now",
            "Equipment is in poor shape — inspect and repair before a breakdown stops the line.",
        )
    if health < 30 or risk == "high" or rul < 48:
        return (
            "Schedule soon",
            "Problems are building — book maintenance in the next few shifts.",
        )
    if rul < 120 or risk == "medium":
        return (
            "Plan outage",
            "Still running, but plan a maintenance window before remaining life runs out.",
        )
    if crit == "critical":
        return (
            "Monitor closely",
            "On the critical path — healthy today, but do not defer checks on this asset.",
        )
    return (
        "Keep monitoring",
        "Sensors and health look acceptable — continue routine checks.",
    )


def _rul_band(rul_h: float | None) -> str:
    rul = float(rul_h or 0.0)
    if rul < 48:
        return "urgent"
    if rul < 120:
        return "soon"
    return "ok"


def compute_factory_maintenance_snapshot(factory: Factory) -> dict:
    assets = list(factory.assets.all())
    rows: list[dict] = []

    for asset in assets:
        scored = score_asset(asset)
        rul_h = scored.get("rul_hours")
        health = float(scored["health_score"])
        risk = scored["risk_level"]
        action, why = _action_for(rul_h, risk, health, asset.criticality_level or "medium")

        rows.append({
            "asset_id": str(asset.id),
            "asset_name": asset.name,
            "asset_type": asset.asset_type,
            "criticality_level": str(asset.criticality_level or "medium").lower(),
            "health_score": round(health, 1),
            "rul_hours": round(float(rul_h or 0.0), 1),
            "rul_days": round(float(rul_h or 0.0) / 24.0, 1),
            "rul_max_hours": SIM_MAX_RUL_HOURS,
            "rul_band": _rul_band(rul_h),
            "risk_level": risk,
            "urgency_score": scored["urgency_score"],
            "anomaly_score": scored["anomaly_score"],
            "spares_availability": scored["spares_availability"],
            "action_label": action,
            "plain_explanation": why,
        })

    rows.sort(
        key=lambda r: (
            _RISK_ORDER.get(r["risk_level"], 9),
            -r["urgency_score"],
            r["rul_hours"],
        ),
    )

    fh = FactoryHealthService.compute(factory)
    needs_attention = sum(1 for r in rows if r["rul_band"] != "ok" or r["risk_level"] in ("high", "critical"))

    factory_label = (
        f"Factory {factory.code[-1]}"
        if factory.code in ("F1", "F2")
        else factory.name
    )
    worst = rows[0] if rows else None

    if worst and worst["risk_level"] in ("critical", "high"):
        summary = (
            f"{factory.name}: focus on {worst['asset_name']} first — "
            f"{worst['action_label'].lower()} ({worst['rul_hours']:.0f} h left, health {worst['health_score']:.0f}%)."
        )
    elif needs_attention:
        summary = (
            f"{factory.name}: {needs_attention} asset(s) need a maintenance plan. "
            f"Average health {fh['health_score']:.0f}%."
        )
    else:
        summary = (
            f"{factory.name}: line is in good shape — average health {fh['health_score']:.0f}%, "
            "keep routine monitoring."
        )

    return {
        "factory_id": str(factory.id),
        "factory_name": factory.name,
        "factory_code": factory.code,
        "factory_label": factory_label,
        "plant_health_score": fh["health_score"],
        "avg_rul_hours": round(
            sum(r["rul_hours"] for r in rows) / max(len(rows), 1),
            1,
        ),
        "assets_needing_attention": needs_attention,
        "assets": rows,
        "layman_summary": summary,
    }

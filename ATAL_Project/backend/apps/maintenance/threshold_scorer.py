"""Deterministic risk scoring via lightweight sklearn logistic + linear models."""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression

from apps.assets.models import Asset, SparesPart
from apps.assets.rul_calculator import SIM_MAX_RUL_HOURS
from apps.assets.services import AssetHealthService
from apps.assets.spares_catalog import catalog_for_asset, ensure_asset_spares

_RISK_LABELS = ("low", "medium", "high", "critical")
_CRIT_WEIGHT = {"critical": 1.0, "high": 0.75, "medium": 0.45, "low": 0.2}

# Features: [health_norm, anomaly, rul_norm, spares_avail, criticality]
_TRAIN_X = np.array(
    [
        [0.95, 0.05, 0.90, 1.00, 0.20],
        [0.85, 0.10, 0.75, 1.00, 0.45],
        [0.72, 0.20, 0.60, 0.75, 0.45],
        [0.58, 0.35, 0.45, 0.50, 0.75],
        [0.42, 0.55, 0.30, 0.25, 0.75],
        [0.28, 0.72, 0.18, 0.00, 1.00],
        [0.15, 0.85, 0.08, 0.00, 1.00],
        [0.08, 0.92, 0.03, 0.00, 1.00],
    ],
    dtype=float,
)
_TRAIN_Y_RISK = np.array([0, 0, 1, 1, 2, 2, 3, 3])
_TRAIN_Y_URGENCY = np.array([0.12, 0.18, 0.32, 0.48, 0.62, 0.78, 0.88, 0.95])

_CLF = LogisticRegression(max_iter=300, solver="lbfgs")
_CLF.fit(_TRAIN_X, _TRAIN_Y_RISK)

_REG = LinearRegression()
_REG.fit(_TRAIN_X, _TRAIN_Y_URGENCY)


def _spares_availability(asset: Asset) -> tuple[float, list[dict]]:
    ensure_asset_spares(asset)
    rows = list(SparesPart.objects.filter(asset=asset)[:6])
    if not rows:
        rows_data = catalog_for_asset(asset)
        if not rows_data:
            return 0.5, []
        in_stock = sum(1 for p in rows_data if (p.get("quantity_in_stock") or 0) > 0)
        return in_stock / len(rows_data), rows_data
    in_stock = sum(1 for s in rows if s.quantity_in_stock > 0)
    parts = [
        {
            "part_name": s.part_name,
            "quantity_in_stock": s.quantity_in_stock,
            "lead_time_days": s.lead_time_days,
            "in_stock": s.quantity_in_stock > 0,
        }
        for s in rows
    ]
    return in_stock / len(rows), parts


def _feature_vector(asset: Asset, health: dict) -> np.ndarray:
    health_norm = min(max(float(health["health_score"]) / 100.0, 0.0), 1.0)
    anomaly = float(health.get("anomaly_score") or 0.1)
    if anomaly > 1.0:
        anomaly = anomaly / 100.0
    anomaly = min(max(anomaly, 0.0), 1.0)

    rul = health.get("rul_hours")
    rul_norm = 0.5
    if rul is not None:
        rul_norm = min(max(float(rul) / SIM_MAX_RUL_HOURS, 0.0), 1.0)

    spares_avail, _ = _spares_availability(asset)
    crit = _CRIT_WEIGHT.get(str(asset.criticality_level or "medium").lower(), 0.5)
    return np.array([[health_norm, anomaly, rul_norm, spares_avail, crit]], dtype=float)


def score_asset(asset: Asset) -> dict:
    """Return ML-threshold scores and raw features for one asset."""
    health = AssetHealthService.compute(asset)
    x = _feature_vector(asset, health)
    risk_idx = int(_CLF.predict(x)[0])
    risk_idx = min(max(risk_idx, 0), len(_RISK_LABELS) - 1)
    risk_level = _RISK_LABELS[risk_idx]

    urgency = float(_REG.predict(x)[0])
    urgency = round(min(max(urgency, 0.05), 0.99), 2)

    spares_avail, parts = _spares_availability(asset)
    max_lead = max((p.get("lead_time_days") or 0 for p in parts), default=21)

    return {
        "asset_id": str(asset.id),
        "asset_name": asset.name,
        "asset_type": asset.asset_type,
        "factory": asset.factory.name,
        "health_score": round(float(health["health_score"]), 1),
        "rul_hours": health.get("rul_hours"),
        "anomaly_score": round(float(health.get("anomaly_score") or 0.1), 2),
        "risk_level": risk_level,
        "urgency_score": urgency,
        "spares_availability": round(spares_avail, 2),
        "max_lead_days": int(max_lead),
        "parts": parts,
        "features": {
            "health_norm": round(float(x[0, 0]), 3),
            "anomaly": round(float(x[0, 1]), 3),
            "rul_norm": round(float(x[0, 2]), 3),
            "spares_avail": round(float(x[0, 3]), 3),
            "criticality": round(float(x[0, 4]), 3),
        },
    }

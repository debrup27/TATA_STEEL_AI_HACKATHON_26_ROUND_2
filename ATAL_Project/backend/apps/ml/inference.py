"""
Per-asset ML model inference service.
All models trained on synthetic data from apps/synthetic/generators/.

Feature format: flat dict {sensor_name_mean, sensor_name_std, sensor_name_min, sensor_name_max}
matching apps/synthetic/dataset_builder.py N_STATS=4 convention.
"""
import logging
from datetime import timedelta

import numpy as np
from django.conf import settings
from django.utils import timezone
from pathlib import Path

from apps.ml.models import MLModel
from apps.assets.models import Asset

logger = logging.getLogger(__name__)

MODEL_ARTIFACT_ROOT = getattr(settings, "MODEL_ARTIFACT_ROOT", Path("/tmp/atal_models"))

# Simulation RUL ceiling — values above this are treated as model scale errors.
MAX_SANE_RUL_HOURS = 300.0

# Minimum samples required to compute meaningful stats; below this inference won't run
MIN_SAMPLES_FOR_INFERENCE = 10
# Look back this many minutes for sensor readings when building the feature vector
FEATURE_WINDOW_MINUTES = 60


def compute_features_for_inference(asset_id: str) -> dict:
    """
    Build a flat feature dict from recent TimescaleDB sensor readings.

    For each sensor, computes: mean, std, min, max over the last FEATURE_WINDOW_MINUTES.
    Returns dict keys like {zone_1_temp_mean, zone_1_temp_std, zone_1_temp_min, zone_1_temp_max, ...}

    This matches the training feature format in apps/synthetic/dataset_builder.py (N_STATS=4).
    Returns {} if no readings found (inference will be skipped).
    """
    from apps.telemetry.models import SensorReading
    from django.db.models import Avg, StdDev, Min, Max

    until = timezone.now() + timedelta(minutes=2)  # include slightly-future synthetic timestamps
    since = timezone.now() - timedelta(minutes=FEATURE_WINDOW_MINUTES)

    rows = (
        SensorReading.objects.filter(
            asset_id=asset_id,
            time__gte=since,
            time__lte=until,
        )
        .values("sensor_def__sensor_name")
        .annotate(
            mean=Avg("value"),
            std=StdDev("value"),
            min=Min("value"),
            max=Max("value"),
        )
    )

    features: dict[str, float] = {}
    for row in rows:
        name = row["sensor_def__sensor_name"]
        features[f"{name}_mean"] = round(row["mean"] or 0.0, 6)
        features[f"{name}_std"] = round(row["std"] or 0.0, 6)
        features[f"{name}_min"] = round(row["min"] or 0.0, 6)
        features[f"{name}_max"] = round(row["max"] or 0.0, 6)

    return features


def _load_model(asset_id: str, model_type: str):
    """
    Load pickled model artifact from registry.
    Models are registered by name '{asset_type}_{model_type}'.
    Returns (model_object, MLModel_record) or raises RuntimeError if not found.
    """
    import joblib

    try:
        asset = Asset.objects.get(id=asset_id)
        asset_type = asset.asset_type
    except Asset.DoesNotExist:
        raise RuntimeError(f"Asset {asset_id} not found")

    model_name = f"{asset_type}_{model_type}"
    model_rec = MLModel.objects.filter(
        name=model_name, status="production"
    ).order_by("-created_at").first()

    if not model_rec:
        raise RuntimeError(f"No production model for {model_name}")

    artifact_path = Path(model_rec.artifact_path)
    if not artifact_path.exists():
        raise RuntimeError(f"Artifact missing: {artifact_path}")

    return joblib.load(artifact_path), model_rec


def run_asset_inference(asset_id: str, model_type: str, features: dict) -> dict:
    """
    Load production model + run prediction with real telemetry features.

    features: flat dict {sensor_name_mean, sensor_name_std, ...} from compute_features_for_inference().
    Raises RuntimeError if model not found or features insufficient — no silent fallback.
    """
    model, model_rec = _load_model(asset_id, model_type)

    # Order features to match training column order stored in model registry
    feature_names = model_rec.training_metrics.get("feature_names", [])
    if not feature_names:
        raise RuntimeError(f"No feature_names in training_metrics for {model_rec.name}")

    if not features:
        raise RuntimeError(
            f"No telemetry features available for asset {asset_id} — "
            f"cannot run inference without real sensor data"
        )

    X = np.array(
        [features.get(fn, 0.0) for fn in feature_names], dtype=np.float32
    ).reshape(1, -1)

    pred = model.predict(X)
    confidence = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)
        confidence = float(proba.max())

    result: dict = {
        "model_type": model_type,
        "prediction": float(pred[0]) if len(pred) else None,
        "confidence": confidence,
        "model_version": model_rec.version,
        "source": "ml_model",
    }

    # For IsolationForest: capture continuous decision_function score
    if model_type == "anomaly_detector" and hasattr(model, "decision_function"):
        ds = model.decision_function(X)
        result["_decision_score"] = float(ds[0])

    _enrich_output(result, model_type)
    return result


def _enrich_output(result: dict, model_type: str) -> None:
    """Normalize prediction to standard output schema."""
    pred = result.get("prediction")
    if model_type == "rul_predictor":
        rul = max(0.0, float(pred)) if pred is not None else None
        if rul is not None and rul > MAX_SANE_RUL_HOURS:
            logger.warning(
                "rul_predictor_outlier asset_type=%s rul_hours=%.1f capped_to_campaign_fallback",
                model_type,
                rul,
            )
            rul = None
        result["rul_hours"] = rul
        # health: 0h→0%, 300h→100%, capped at 100 (simulation scale)
        result["health_score"] = min(100.0, max(0.0, (rul / MAX_SANE_RUL_HOURS) * 100.0)) if rul else 50.0
    elif model_type == "anomaly_detector":
        # IsolationForest.predict returns +1 (normal) or -1 (anomaly)
        # anomaly_score: 0=healthy, 1=anomalous
        is_anomaly = float(pred) < 0 if pred is not None else False
        result["anomaly_score"] = 1.0 if is_anomaly else 0.0
        result["health_score"] = 20.0 if is_anomaly else 95.0
        # Store decision_function score if available for continuous signal
        if "_decision_score" in result:
            ds = float(result.pop("_decision_score"))
            # decision_function: more negative = more anomalous, typical range [-0.5, 0.5]
            # map to 0-100: 0 at ds=-0.5, 100 at ds=+0.5
            health = min(100.0, max(0.0, (ds + 0.5) * 100.0))
            result["health_score"] = round(health, 2)
            result["anomaly_score"] = round(max(0.0, -ds), 4)
    elif model_type == "classifier":
        cls = int(pred) if pred is not None else 0
        result["fault_classification"] = cls
        result["health_score"] = 100.0 if cls == 0 else max(10.0, 60.0 - cls * 20.0)


def compute_composite_health(
    rul_result: dict | None,
    anomaly_result: dict | None,
    classifier_result: dict | None,
) -> float:
    """
    Weighted composite health score from the three real model outputs.
      - RUL predictor:     50% weight (lifecycle signal)
      - Anomaly detector:  30% weight (real-time sensor pattern)
      - Fault classifier:  20% weight (discrete fault mode)
    Falls back to available models only if some failed.
    """
    scores: list[tuple[float, float]] = []  # (score, weight)
    if rul_result and "health_score" in rul_result and rul_result.get("source") != "error":
        scores.append((float(rul_result["health_score"]), 0.5))
    if anomaly_result and "health_score" in anomaly_result and anomaly_result.get("source") != "error":
        scores.append((float(anomaly_result["health_score"]), 0.3))
    if classifier_result and "health_score" in classifier_result and classifier_result.get("source") != "error":
        scores.append((float(classifier_result["health_score"]), 0.2))

    if not scores:
        return 80.0  # no models ran — default neutral

    total_weight = sum(w for _, w in scores)
    composite = sum(s * w for s, w in scores) / total_weight
    return round(min(100.0, max(0.0, composite)), 2)


def compute_shap_values(asset_id: str, model_type: str, features: dict) -> dict | None:
    """Compute SHAP top-10 feature contributions for tree-based models."""
    try:
        import shap

        model, model_rec = _load_model(asset_id, model_type)
        feature_names = model_rec.training_metrics.get("feature_names", list(features.keys()))
        X = np.array(
            [features.get(fn, 0.0) for fn in feature_names], dtype=np.float32
        ).reshape(1, -1)

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X, check_additivity=False)
        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        contributions = sorted(
            zip(feature_names, shap_values[0].tolist()),
            key=lambda x: abs(x[1]),
            reverse=True,
        )
        return {
            "top_features": [{"feature": k, "shap_value": v} for k, v in contributions[:10]],
            "base_value": (
                float(explainer.expected_value)
                if not isinstance(explainer.expected_value, list)
                else float(explainer.expected_value[0])
            ),
        }
    except Exception as exc:
        logger.warning("shap_error error=%s", str(exc))
        return None

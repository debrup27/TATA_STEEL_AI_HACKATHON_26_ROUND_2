"""
Per-asset ML model inference service.
All models trained on synthetic data from apps/synthetic/generators/.
"""
import logging
import numpy as np
from pathlib import Path
from django.conf import settings
from apps.ml.models import MLModel, MLPrediction
from apps.assets.models import Asset

logger = logging.getLogger(__name__)

MODEL_ARTIFACT_ROOT = getattr(settings, "MODEL_ARTIFACT_ROOT", Path("/tmp/atal_models"))


def _load_model(asset_id: str, model_type: str):
    """
    Load pickled model artifact from registry.
    Models are registered by name '{asset_type}_{model_type}' (type-level, not instance-level).
    """
    import joblib
    # Resolve asset_type from asset_id
    try:
        asset = Asset.objects.get(id=asset_id)
        asset_type = asset.asset_type
    except Asset.DoesNotExist:
        return None, None

    model_name = f"{asset_type}_{model_type}"
    model_rec = MLModel.objects.filter(
        name=model_name, status="production"
    ).order_by("-created_at").first()
    if not model_rec:
        return None, None
    artifact_path = Path(model_rec.artifact_path)
    if not artifact_path.exists():
        logger.warning("artifact_missing name=%s path=%s", model_name, str(artifact_path))
        return None, model_rec
    return joblib.load(artifact_path), model_rec


def run_asset_inference(asset_id: str, model_type: str, features: dict) -> dict:
    """
    Load production model + run prediction.
    features: flat dict of sensor-aggregate stats (mean/std/min/max per sensor).
    Returns prediction_output dict.
    """
    model, model_rec = _load_model(asset_id, model_type)
    if model is None:
        return _physics_fallback(asset_id, model_type, features)

    # Order features to match training column order
    feature_names = model_rec.training_metrics.get("feature_names", []) if model_rec else []
    if feature_names and features:
        X = np.array([features.get(fn, 0.0) for fn in feature_names], dtype=np.float32).reshape(1, -1)
    else:
        X = np.array(list(features.values()), dtype=np.float32).reshape(1, -1)

    try:
        pred = model.predict(X)
        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X)
            confidence = float(proba.max())
        result = {
            "model_type": model_type,
            "prediction": float(pred[0]) if len(pred) else None,
            "confidence": confidence,
            "model_version": model_rec.version if model_rec else None,
        }
        _enrich_output(result, model_type)
        return result
    except Exception as exc:
        logger.warning("inference_error model_type=%s error=%s", model_type, str(exc))
        return _physics_fallback(asset_id, model_type, features)


def _enrich_output(result: dict, model_type: str):
    """Normalize output keys to standard schema."""
    pred = result.get("prediction")
    if model_type == "rul_predictor":
        result["rul_hours"] = max(0, float(pred)) if pred is not None else None
        result["health_score"] = min(100, max(0, (float(pred) / 2000) * 100)) if pred else 50.0
    elif model_type == "anomaly_detector":
        score = float(pred) if pred is not None else 0.5
        result["anomaly_score"] = score
        result["health_score"] = max(0, (1 - score) * 100)
    elif model_type == "classifier":
        result["fault_classification"] = int(pred) if pred is not None else 0
        result["health_score"] = 100 if pred == 0 else max(10, 60 - int(pred) * 20)
    elif model_type == "health_score":
        result["health_score"] = float(pred) if pred is not None else 80.0


def _physics_fallback(asset_id: str, model_type: str, features: dict) -> dict:
    """Return a safe default when no trained model exists yet."""
    return {
        "model_type": model_type,
        "prediction": None,
        "confidence": None,
        "health_score": 80.0,
        "anomaly_score": 0.1,
        "rul_hours": 1000.0,
        "fault_classification": 0,
        "source": "physics_fallback",
    }


def compute_shap_values(asset_id: str, model_type: str, features: dict) -> dict | None:
    """Compute SHAP top-10 feature contributions for tree-based models."""
    try:
        import shap
        model, model_rec = _load_model(asset_id, model_type)
        if model is None:
            return None
        X = np.array(list(features.values())).reshape(1, -1)
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)
        feature_names = list(features.keys())
        if isinstance(shap_values, list):
            shap_values = shap_values[0]
        contributions = sorted(
            zip(feature_names, shap_values[0].tolist()),
            key=lambda x: abs(x[1]),
            reverse=True,
        )
        return {
            "top_features": [{"feature": k, "shap_value": v} for k, v in contributions[:10]],
            "base_value": float(explainer.expected_value) if not isinstance(explainer.expected_value, list)
            else float(explainer.expected_value[0]),
        }
    except Exception as exc:
        logger.warning("shap_error error=%s", str(exc))
        return None

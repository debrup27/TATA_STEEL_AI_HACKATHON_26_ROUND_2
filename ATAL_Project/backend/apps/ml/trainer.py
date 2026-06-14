"""
Train per-asset-type ML models from synthetic datasets.

Trains three model types per asset type:
  rul_predictor   — XGBoost regressor predicting remaining useful life (hours)
  classifier      — XGBoost binary classifier (0=normal, 1=fault)
  anomaly_detector — IsolationForest trained on normal-condition data only

Artifacts saved to: MODEL_ARTIFACT_ROOT/{asset_type}/{model_type}_v{version}.joblib
MLModel DB records created/promoted to production.
"""
import logging
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
from django.conf import settings
from django.utils import timezone as dj_tz

class KwargsLogger:
    def __init__(self, logger):
        self.logger = logger
    def info(self, msg, *args, **kwargs):
        if kwargs:
            self.logger.info(f"{msg} {kwargs}", *args)
        else:
            self.logger.info(msg, *args)
    def error(self, msg, *args, **kwargs):
        if kwargs:
            self.logger.error(f"{msg} {kwargs}", *args)
        else:
            self.logger.error(msg, *args)
    def warning(self, msg, *args, **kwargs):
        if kwargs:
            self.logger.warning(f"{msg} {kwargs}", *args)
        else:
            self.logger.warning(msg, *args)
    def debug(self, msg, *args, **kwargs):
        if kwargs:
            self.logger.debug(f"{msg} {kwargs}", *args)
        else:
            self.logger.debug(msg, *args)

logger = KwargsLogger(logging.getLogger(__name__))


def _clean_metrics(d: dict) -> dict:
    """Replace NaN/Inf with None so PostgreSQL JSON accepts the dict."""
    out = {}
    for k, v in d.items():
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            out[k] = None
        else:
            out[k] = v
    return out

MODEL_ARTIFACT_ROOT: Path = Path(
    getattr(settings, "MODEL_ARTIFACT_ROOT", "/tmp/atal_models")
)

ALL_ASSET_TYPES = ["SRF", "HHPD", "FS", "HAGCC", "APT", "TCMS", "CGP", "HPAK"]


def _artifact_path(asset_type: str, model_type: str, version: str) -> Path:
    p = MODEL_ARTIFACT_ROOT / asset_type / model_type
    p.mkdir(parents=True, exist_ok=True)
    return p / f"v{version}.joblib"


def _next_version(asset_type: str, model_type: str) -> str:
    from apps.ml.models import MLModel
    latest = (
        MLModel.objects.filter(
            name=f"{asset_type}_{model_type}",
        )
        .order_by("-created_at")
        .first()
    )
    if not latest:
        return "1.0.0"
    parts = latest.version.split(".")
    try:
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
        return f"{major}.{minor}.{patch + 1}"
    except (IndexError, ValueError):
        return "1.0.0"


def _deprecate_old(asset_type: str, model_type: str):
    from apps.ml.models import MLModel
    MLModel.objects.filter(
        name=f"{asset_type}_{model_type}", status="production"
    ).update(status="deprecated")


def _register_model(
    asset_type: str,
    model_type: str,
    algorithm: str,
    version: str,
    artifact_path: Path,
    metrics: dict,
) -> "MLModel":
    from apps.ml.models import MLModel
    from apps.assets.models import Asset
    import math

    def clean_metrics_dict(val):
        if isinstance(val, dict):
            return {k: clean_metrics_dict(v) for k, v in val.items()}
        elif isinstance(val, list):
            return [clean_metrics_dict(v) for v in val]
        elif isinstance(val, float):
            if math.isnan(val) or math.isinf(val):
                return 0.0
        return val

    metrics = clean_metrics_dict(metrics)

    _deprecate_old(asset_type, model_type)

    rec, _ = MLModel.objects.get_or_create(
        name=f"{asset_type}_{model_type}",
        version=version,
        defaults={
            "model_type": model_type,
            "algorithm": algorithm,
            "artifact_path": str(artifact_path),
            "training_date": dj_tz.now(),
            "training_metrics": metrics,
            "status": "production",
        },
    )
    rec.artifact_path = str(artifact_path)
    rec.training_date = dj_tz.now()
    rec.training_metrics = metrics
    rec.status = "production"
    rec.save()

    # Link to all assets of this type
    for asset in Asset.objects.filter(asset_type=asset_type):
        rec.asset = asset
        break  # Set to first; inference uses asset_type-level lookup via name

    return rec


def _xgb_fit_params(fast: bool) -> dict:
    """XGBoost uses CPU (tree_method=hist). GPU reserved for Ollama/BGE at boot."""
    if fast:
        return {
            "n_estimators": 40,
            "max_depth": 4,
            "learning_rate": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "tree_method": "hist",
            "n_jobs": 2,
            "verbosity": 0,
        }
    return {
        "n_estimators": 200,
        "max_depth": 6,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "tree_method": "hist",
        "n_jobs": -1,
        "verbosity": 0,
    }


def _train_rul(X: np.ndarray, y_rul: np.ndarray, *, fast: bool = False) -> tuple:
    from xgboost import XGBRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, r2_score

    X_tr, X_val, y_tr, y_val = train_test_split(X, y_rul, test_size=0.2, random_state=42)
    params = _xgb_fit_params(fast)
    model = XGBRegressor(
        objective="reg:squarederror",
        random_state=42,
        **params,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
    preds = model.predict(X_val)
    metrics = {
        "mae_hours": round(float(mean_absolute_error(y_val, preds)), 2),
        "r2": round(float(r2_score(y_val, preds)), 4),
        "n_train": int(len(X_tr)),
        "n_val": int(len(X_val)),
    }
    return model, metrics


def _train_classifier(X: np.ndarray, y_fault: np.ndarray, *, fast: bool = False) -> tuple:
    from xgboost import XGBClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import f1_score, accuracy_score, roc_auc_score

    X_tr, X_val, y_tr, y_val = train_test_split(X, y_fault, test_size=0.2, random_state=42, stratify=y_fault)
    # Handle imbalanced classes
    pos = y_tr.sum()
    neg = len(y_tr) - pos
    scale = neg / max(pos, 1)

    params = _xgb_fit_params(fast)
    model = XGBClassifier(
        scale_pos_weight=scale,
        objective="binary:logistic",
        random_state=42,
        **params,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
    preds = model.predict(X_val)
    proba = model.predict_proba(X_val)[:, 1]
    metrics = {
        "f1": round(float(f1_score(y_val, preds, zero_division=0)), 4),
        "accuracy": round(float(accuracy_score(y_val, preds)), 4),
        "roc_auc": round(float(roc_auc_score(y_val, proba)), 4),
        "n_train": int(len(X_tr)),
        "n_val": int(len(X_val)),
        "fault_rate_train": round(float(y_tr.mean()), 3),
    }
    return model, metrics


def _train_anomaly(X: np.ndarray, y_fault: np.ndarray, *, fast: bool = False) -> tuple:
    from sklearn.ensemble import IsolationForest
    from sklearn.metrics import roc_auc_score

    # Train only on normal samples
    X_normal = X[y_fault == 0]
    if len(X_normal) < 10:
        X_normal = X  # fallback if dataset is all-fault

    model = IsolationForest(
        n_estimators=40 if fast else 200,
        contamination=0.1,
        random_state=42,
        n_jobs=2 if fast else -1,
    )
    model.fit(X_normal)

    # Score: -1 = anomaly, 1 = normal; map to [0,1] anomaly probability
    scores = -model.decision_function(X)  # higher = more anomalous
    scores = (scores - scores.min()) / (scores.max() - scores.min() + 1e-9)

    auc = float(roc_auc_score(y_fault, scores)) if y_fault.sum() > 0 else 0.5
    metrics = {
        "roc_auc": round(auc, 4),
        "n_normal_train": int(len(X_normal)),
        "n_total": int(len(X)),
        "contamination": 0.1,
    }
    return model, metrics


def train_asset_type(
    asset_type: str,
    n_scenarios: int = 300,
    rich: bool = False,
    fast: bool = False,
) -> Dict[str, dict]:
    """
    Train all three model types for one asset type.
    Returns {model_type: metrics}.
    """
    from apps.synthetic.dataset_builder import build_dataset, build_feature_names

    logger.info("train_start asset_type=%s n_scenarios=%d rich=%s", asset_type, n_scenarios, rich)

    X, y_rul, y_fault, feature_names = build_dataset(
        asset_type, n_scenarios=n_scenarios, rich=rich
    )

    version = _next_version(asset_type, "rul_predictor")
    results = {}

    # -- RUL Predictor --
    try:
        rul_model, rul_metrics = _train_rul(X, y_rul, fast=fast)
        rul_metrics["feature_names"] = feature_names
        path = _artifact_path(asset_type, "rul_predictor", version)
        joblib.dump(rul_model, path)
        _register_model(asset_type, "rul_predictor", "xgboost", version, path, _clean_metrics(rul_metrics))
        results["rul_predictor"] = rul_metrics
        logger.info("rul_trained asset_type=%s mae=%.2f r2=%.4f", asset_type, rul_metrics.get("mae_hours", 0), rul_metrics.get("r2", 0))
    except Exception as exc:
        logger.error("rul_train_error asset_type=%s error=%s", asset_type, exc)
        results["rul_predictor"] = {"error": str(exc)}

    # -- Fault Classifier --
    try:
        cls_model, cls_metrics = _train_classifier(X, y_fault, fast=fast)
        cls_metrics["feature_names"] = feature_names
        path = _artifact_path(asset_type, "classifier", version)
        joblib.dump(cls_model, path)
        _register_model(asset_type, "classifier", "xgboost", version, path, _clean_metrics(cls_metrics))
        results["classifier"] = cls_metrics
        logger.info("classifier_trained asset_type=%s f1=%.4f roc_auc=%s", asset_type, cls_metrics.get("f1", 0), cls_metrics.get("roc_auc"))
    except Exception as exc:
        logger.error("classifier_train_error asset_type=%s error=%s", asset_type, exc)
        results["classifier"] = {"error": str(exc)}

    # -- Anomaly Detector --
    try:
        anm_model, anm_metrics = _train_anomaly(X, y_fault, fast=fast)
        anm_metrics["feature_names"] = feature_names
        path = _artifact_path(asset_type, "anomaly_detector", version)
        joblib.dump(anm_model, path)
        _register_model(asset_type, "anomaly_detector", "isolation_forest", version, path, _clean_metrics(anm_metrics))
        results["anomaly_detector"] = anm_metrics
        logger.info("anomaly_trained asset_type=%s roc_auc=%.4f", asset_type, anm_metrics.get("roc_auc", 0))
    except Exception as exc:
        logger.error("anomaly_train_error asset_type=%s error=%s", asset_type, exc)
        results["anomaly_detector"] = {"error": str(exc)}

    return results


def train_all(
    asset_types: Optional[List[str]] = None,
    n_scenarios: int = 300,
    rich: bool = False,
    skip_if_exists: bool = False,
    fast: bool = False,
) -> Dict[str, Dict[str, dict]]:
    """
    Train all asset types. Returns nested {asset_type: {model_type: metrics}}.
    """
    from apps.ml.models import MLModel

    targets = asset_types or ALL_ASSET_TYPES
    all_results = {}

    for at in targets:
        if skip_if_exists:
            # Skip if all 3 model types already have production artifacts
            existing = MLModel.objects.filter(
                name__startswith=f"{at}_",
                status="production",
            ).values_list("model_type", flat=True)
            needed = {"rul_predictor", "classifier", "anomaly_detector"}
            if needed.issubset(set(existing)):
                # Verify artifact files actually exist
                all_exist = True
                for mt in needed:
                    rec = MLModel.objects.filter(
                        name=f"{at}_{mt}", status="production"
                    ).order_by("-created_at").first()
                    if rec and not Path(rec.artifact_path).exists():
                        all_exist = False
                        break
                if all_exist:
                    logger.info("train_skip_exists asset_type=%s", at)
                    all_results[at] = {"skipped": True}
                    continue

        try:
            all_results[at] = train_asset_type(at, n_scenarios=n_scenarios, rich=rich, fast=fast)
        except Exception as exc:
            logger.error("train_asset_error asset_type=%s error=%s", at, exc)
            all_results[at] = {"error": str(exc)}

    return all_results

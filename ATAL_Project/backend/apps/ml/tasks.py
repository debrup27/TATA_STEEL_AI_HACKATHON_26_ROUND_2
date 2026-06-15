import logging
from celery import shared_task, group
from django.utils import timezone

logger = logging.getLogger(__name__)

# Model types with trained artifacts — health_score is computed as composite, not inferred
INFERENCE_MODEL_TYPES = ["rul_predictor", "anomaly_detector", "classifier"]


@shared_task(name="apps.ml.run_asset_inference", bind=True, max_retries=2)
def run_asset_inference_task(self, asset_id: str, model_type: str):
    """
    Run a single model type for an asset using real telemetry features.
    Builds {sensor_name_mean/std/min/max} feature vector from TimescaleDB.
    Persists MLPrediction and updates AssetTwinState.health_score.
    """
    from apps.assets.models import Asset
    from apps.twins.models import AssetTwinState
    from apps.ml.models import MLPrediction, MLModel
    from apps.ml.inference import (
        compute_features_for_inference,
        run_asset_inference,
        compute_shap_values,
    )

    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        logger.error("ml_inference_error asset_id=%s error=Asset not found", asset_id)
        raise

    # Build features from real telemetry (mean/std/min/max per sensor, last 60 min)
    features = compute_features_for_inference(asset_id)
    if not features:
        raise RuntimeError(
            f"No telemetry data for asset {asset_id} ({asset.asset_type}) — skipping inference"
        )

    try:
        result = run_asset_inference(str(asset.id), model_type, features)
    except RuntimeError as exc:
        logger.error("ml_inference_error asset_id=%s model_type=%s error=%s", asset_id, model_type, str(exc))
        raise

    shap_vals = compute_shap_values(str(asset.id), model_type, features)

    model_rec = MLModel.objects.filter(
        name=f"{asset.asset_type}_{model_type}", status="production"
    ).order_by("-created_at").first()

    # model_rec can be None for edge cases; FK is now nullable (see migration 0003)
    pred = MLPrediction.objects.create(
        model=model_rec,
        asset=asset,
        input_features=features,
        prediction_output=result,
        confidence=result.get("confidence"),
        shap_values=shap_vals,
        celery_task_id=self.request.id,
    )

    # Update twin health_score from this model's output
    twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
    if "health_score" in result:
        # Only update twin if this model has higher authority (rul_predictor primary)
        if model_type == "rul_predictor" or twin.health_score == 100.0:
            twin.health_score = result["health_score"]
            twin.save(update_fields=["health_score", "updated_at"])

    # Notify via WS (predictions group per asset)
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"predictions_{asset_id}",
                {
                    "type": "prediction.new",
                    "prediction_id": str(pred.id),
                    "model_type": model_type,
                    "result": result,
                },
            )
    except Exception as exc:
        logger.warning("ws_notify_failed asset_id=%s error=%s", asset_id, str(exc))

    return {"prediction_id": str(pred.id), "result": result}


@shared_task(name="apps.ml.run_all_asset_models", bind=True)
def run_all_asset_models(self, asset_id: str):
    """
    Authoritative asset state via the DETERMINISTIC engine (apps.ml.deterministic).

    The deterministic engine is the single source of truth for health / anomaly / RUL — it always
    obeys the abnormality toggle and criticality. The pickled XGBoost/IsolationForest models are
    attempted only as a sanity-gated fallback: if they run and look plausible, their raw RUL is
    stashed under `_ml_rul_raw` for rul_calculator's gate; otherwise we proceed without them.
    Writes MLPrediction.prediction_output + AssetTwinState.health_score, never raises on missing
    telemetry / model.
    """
    from apps.assets.models import Asset
    from apps.twins.models import AssetTwinState
    from apps.ml.models import MLPrediction, MLModel
    from apps.ml.deterministic import compute_asset_state

    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        logger.error("run_all_models error=Asset not found asset_id=%s", asset_id)
        raise

    # Best-effort pickled-ML attempt (gated fallback only) — never fatal.
    ml_rul_raw = None
    features = {}
    try:
        from apps.ml.inference import compute_features_for_inference, run_asset_inference

        features = compute_features_for_inference(asset_id) or {}
        if features:
            rul_try = run_asset_inference(str(asset.id), "rul_predictor", features)
            ml_rul_raw = rul_try.get("rul_hours")
    except Exception as exc:
        logger.info("ml_fallback_unavailable asset_id=%s reason=%s", asset_id, str(exc))

    # Deterministic authoritative state.
    consolidated = compute_asset_state(asset)
    if ml_rul_raw is not None:
        consolidated["_ml_rul_raw"] = ml_rul_raw

    model_rec = MLModel.objects.filter(
        name=f"{asset.asset_type}_rul_predictor", status="production"
    ).order_by("-created_at").first()

    pred = MLPrediction.objects.create(
        model=model_rec,
        asset=asset,
        input_features=features,
        prediction_output=consolidated,
        confidence=consolidated.get("fault_confidence"),
        shap_values=None,
        celery_task_id=getattr(self.request, "id", None),
    )

    # Update twin health from the authoritative deterministic value.
    twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
    twin.health_score = consolidated["health_score"]
    twin.save(update_fields=["health_score", "updated_at"])

    logger.info(
        "deterministic_state asset=%s health=%.1f rul_h=%s anomaly=%s fault_cls=%s",
        asset.asset_type,
        consolidated["health_score"],
        consolidated.get("rul_hours"),
        consolidated.get("anomaly_score"),
        consolidated.get("fault_classification"),
    )

    # WS notify
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"predictions_{asset_id}",
                {
                    "type": "prediction.new",
                    "prediction_id": str(pred.id),
                    "model_type": "consolidated",
                    "result": consolidated,
                },
            )
    except Exception as exc:
        logger.warning("ws_notify_failed asset_id=%s error=%s", asset_id, str(exc))

    return {"prediction_id": str(pred.id), "consolidated": consolidated}


@shared_task(name="apps.ml.run_inference_all_assets")
def run_inference_all_assets():
    """
    Periodic task: run consolidated ML inference for all assets.
    Beat: every 5 minutes (after synthetic telemetry at 30s, twin state fresh).
    """
    from apps.assets.models import Asset
    dispatched = 0
    for asset in Asset.objects.all():
        run_all_asset_models.apply_async(args=[str(asset.id)], queue="ml_inference")
        dispatched += 1
    logger.info("inference_all_assets_dispatched count=%d", dispatched)
    return {"dispatched": dispatched}


@shared_task(name="apps.ml.check_model_drift")
def check_model_drift(asset_id: str, model_type: str):
    from scipy import stats
    from apps.ml.models import MLPrediction

    preds = MLPrediction.objects.filter(
        asset_id=asset_id,
        model__model_type=model_type,
    ).order_by("-prediction_time")[:200]

    if len(preds) < 50:
        return {"status": "insufficient_data", "count": len(preds)}

    recent = [list(p.input_features.values()) for p in preds[:50] if p.input_features]
    baseline = [list(p.input_features.values()) for p in preds[50:] if p.input_features]

    if not recent or not baseline:
        return {"status": "insufficient_data"}

    # Align feature vectors to same length (first N common features)
    n_feats = min(
        len(recent[0]) if recent else 0,
        len(baseline[0]) if baseline else 0,
    )
    if n_feats == 0:
        return {"status": "no_features"}

    drift_metrics = {}
    for i in range(n_feats):
        r_vals = [row[i] for row in recent if len(row) > i]
        b_vals = [row[i] for row in baseline if len(row) > i]
        if len(r_vals) < 10 or len(b_vals) < 10:
            continue
        ks_stat, p_val = stats.ks_2samp(r_vals, b_vals)
        drift_metrics[f"feat_{i}"] = {"ks_stat": round(ks_stat, 4), "p_value": round(p_val, 4)}

    n_drifted = sum(1 for m in drift_metrics.values() if m["p_value"] < 0.05)
    drift_ratio = n_drifted / max(len(drift_metrics), 1)

    if drift_ratio > 0.3:
        logger.warning(
            "drift_detected asset_id=%s model_type=%s drift_ratio=%.2f — scheduling retrain",
            asset_id, model_type, drift_ratio,
        )
        trigger_retrain.apply_async(args=[asset_id, model_type])

    return {"drift_ratio": round(drift_ratio, 4), "n_drifted_features": n_drifted}


@shared_task(name="apps.ml.check_all_drift")
def check_all_drift():
    """Check drift for all assets/model types every 6h."""
    from apps.assets.models import Asset
    dispatched = 0
    for asset in Asset.objects.all():
        for mt in INFERENCE_MODEL_TYPES:
            check_model_drift.apply_async(args=[str(asset.id), mt], queue="ml_inference")
            dispatched += 1
    return {"dispatched_checks": dispatched}


@shared_task(name="apps.ml.retrain_trigger")
def trigger_retrain(asset_id: str, model_type: str):
    from apps.assets.models import Asset
    try:
        asset = Asset.objects.get(id=asset_id)
        logger.info(
            "drift_retrain_triggered asset_id=%s asset_type=%s model_type=%s",
            asset_id, asset.asset_type, model_type,
        )
        generate_dataset_and_retrain.apply_async(
            kwargs={"asset_types": [asset.asset_type], "rich": True},
            queue="ml_inference",
        )
        return {"status": "retrain_scheduled", "asset_type": asset.asset_type, "model_type": model_type}
    except Exception as exc:
        logger.error("retrain_trigger_error error=%s", str(exc))
        return {"status": "error", "error": str(exc)}


@shared_task(name="apps.ml.generate_dataset_and_retrain", bind=True)
def generate_dataset_and_retrain(
    self,
    asset_types: list = None,
    n_scenarios: int = 1000,
    rich: bool = True,
):
    """Weekly retrain (Celery Beat: Sunday 02:00 UTC)."""
    from apps.ml.trainer import train_all, ALL_ASSET_TYPES

    targets = asset_types or ALL_ASSET_TYPES
    logger.info(
        "scheduled_retrain_start task_id=%s asset_types=%s n_scenarios=%d",
        self.request.id, targets, n_scenarios,
    )

    results = train_all(
        asset_types=targets,
        n_scenarios=n_scenarios,
        rich=rich,
        skip_if_exists=False,
    )

    ok = sum(1 for v in results.values() if "error" not in v and not v.get("skipped"))
    failed = sum(1 for v in results.values() if "error" in v)
    logger.info("scheduled_retrain_complete ok=%d failed=%d", ok, failed)

    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                "admin_notifications",
                {"type": "retrain.complete", "ok": ok, "failed": failed, "asset_types": targets},
            )
    except Exception as exc:
        logger.warning("retrain_ws_notify_failed error=%s", str(exc))

    # After retrain, kick off fresh inference for all assets
    run_inference_all_assets.apply_async(queue="ml_inference")

    return {"ok": ok, "failed": failed, "asset_types": targets}

import logging
from celery import shared_task, group
from django.utils import timezone

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


@shared_task(name="apps.ml.run_asset_inference", bind=True)
def run_asset_inference_task(self, asset_id: str, model_type: str):
    from apps.assets.models import Asset
    from apps.twins.models import AssetTwinState
    from apps.ml.models import MLPrediction, MLModel
    from apps.ml.inference import run_asset_inference, compute_shap_values

    try:
        asset = Asset.objects.get(id=asset_id)
        twin = AssetTwinState.objects.filter(asset=asset).first()
        features = twin.state if twin else {}

        result = run_asset_inference(str(asset.id), model_type, features)
        shap_vals = compute_shap_values(str(asset.id), model_type, features)

        model_rec = MLModel.objects.filter(
            name=f"{asset.asset_type}_{model_type}", status="production"
        ).order_by("-created_at").first()

        pred = MLPrediction.objects.create(
            model=model_rec,
            asset=asset,
            input_features=features,
            prediction_output=result,
            confidence=result.get("confidence"),
            shap_values=shap_vals,
            celery_task_id=self.request.id,
        )

        if twin and "health_score" in result:
            twin.health_score = result["health_score"]
            twin.save(update_fields=["health_score", "updated_at"])

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"predictions_{asset_id}",
            {
                "type": "prediction.new",
                "prediction_id": str(pred.id),
                "model_type": model_type,
                "result": result,
            },
        )

        return {"prediction_id": str(pred.id), "result": result}

    except Exception as exc:
        logger.error("ml_inference_error asset_id=%s model_type=%s error=%s", asset_id, model_type, str(exc))
        raise


@shared_task(name="apps.ml.run_consolidation_inference")
def run_all_asset_models(asset_id: str):
    """Run all applicable model types for an asset in parallel."""
    MODEL_TYPES = ["rul_predictor", "anomaly_detector", "classifier", "health_score"]
    job = group(
        run_asset_inference_task.s(asset_id, mt) for mt in MODEL_TYPES
    )
    result = job.apply_async()
    return result.id


@shared_task(name="apps.ml.check_model_drift")
def check_model_drift(asset_id: str, model_type: str):
    from scipy import stats
    from apps.ml.models import MLPrediction
    import numpy as np

    preds = MLPrediction.objects.filter(
        asset_id=asset_id, model__model_type=model_type
    ).order_by("-prediction_time")[:200]

    if len(preds) < 50:
        return {"status": "insufficient_data"}

    recent = [list(p.input_features.values()) for p in preds[:50] if p.input_features]
    baseline = [list(p.input_features.values()) for p in preds[50:] if p.input_features]

    if not recent or not baseline:
        return {"status": "insufficient_data"}

    drift_metrics = {}
    for feat_idx in range(min(len(recent[0]), len(baseline[0]))):
        r_vals = [row[feat_idx] for row in recent if len(row) > feat_idx]
        b_vals = [row[feat_idx] for row in baseline if len(row) > feat_idx]
        ks_stat, p_val = stats.ks_2samp(r_vals, b_vals)
        drift_metrics[f"feat_{feat_idx}"] = {"ks_stat": ks_stat, "p_value": p_val}

    n_drifted = sum(1 for m in drift_metrics.values() if m["p_value"] < 0.05)
    drift_ratio = n_drifted / max(len(drift_metrics), 1)

    if drift_ratio > 0.3:
        trigger_retrain.apply_async(args=[asset_id, model_type])

    return {"drift_ratio": drift_ratio, "n_drifted_features": n_drifted}


@shared_task(name="apps.ml.check_all_drift")
def check_all_drift():
    """Check drift for all assets and all model types (scheduled every 6hr)."""
    from apps.assets.models import Asset
    MODEL_TYPES = ["rul_predictor", "classifier", "anomaly_detector"]
    dispatched = 0
    for asset in Asset.objects.all():
        for mt in MODEL_TYPES:
            check_model_drift.apply_async(args=[str(asset.id), mt])
            dispatched += 1
    return {"dispatched_checks": dispatched}


@shared_task(name="apps.ml.retrain_trigger")
def trigger_retrain(asset_id: str, model_type: str):
    """Notify Admin and schedule training job when drift detected."""
    from apps.assets.models import Asset
    try:
        asset = Asset.objects.get(id=asset_id)
        asset_type = asset.asset_type
        logger.info("drift_retrain_triggered asset_id=%s asset_type=%s model_type=%s", asset_id, asset_type, model_type)
        # Kick off targeted retraining for this asset type
        generate_dataset_and_retrain.apply_async(
            kwargs={"asset_types": [asset_type], "rich": True}
        )
        return {"status": "retrain_scheduled", "asset_type": asset_type, "model_type": model_type}
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
    """
    Weekly retrain task (Celery Beat: Sunday 02:00 UTC).
    1. Generate rich synthetic dataset.
    2. Retrain all three model types per asset type.
    3. Promote new artifacts to production.
    """
    from apps.ml.trainer import train_all, ALL_ASSET_TYPES

    targets = asset_types or ALL_ASSET_TYPES
    logger.info("scheduled_retrain_start task_id=%s asset_types=%s n_scenarios=%d rich=%s", self.request.id, targets, n_scenarios, rich)

    results = train_all(
        asset_types=targets,
        n_scenarios=n_scenarios,
        rich=rich,
        skip_if_exists=False,  # forced retrain — always replace
    )

    ok = sum(1 for v in results.values() if "error" not in v and not v.get("skipped"))
    failed = sum(1 for v in results.values() if "error" in v)

    logger.info("scheduled_retrain_complete ok=%d failed=%d", ok, failed)

    # Notify via WS (admin group)
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "admin_notifications",
            {
                "type": "retrain.complete",
                "ok": ok,
                "failed": failed,
                "asset_types": targets,
            },
        )
    except Exception:
        pass

    return {"ok": ok, "failed": failed, "asset_types": targets}

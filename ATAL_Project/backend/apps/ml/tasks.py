import logging
from celery import shared_task, group
from django.utils import timezone

logger = logging.getLogger(__name__)


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

        result = run_asset_inference(asset_id, model_type, features)
        shap_vals = compute_shap_values(asset_id, model_type, features)

        model_rec = MLModel.objects.filter(
            asset_id=asset_id, model_type=model_type, status="production"
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

        # Update twin health score
        if twin and "health_score" in result:
            twin.health_score = result["health_score"]
            twin.save(update_fields=["health_score", "updated_at"])

        # Emit WS event
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
        logger.error("ml_inference_error", asset_id=asset_id, model_type=model_type, error=str(exc))
        raise


@shared_task(name="apps.ml.run_consolidation_inference")
def run_all_asset_models(asset_id: str):
    """Run all applicable model types for an asset in parallel."""
    MODEL_TYPES = [
        "rul_predictor", "anomaly_detector", "classifier", "health_score"
    ]
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


@shared_task(name="apps.ml.retrain_trigger")
def trigger_retrain(asset_id: str, model_type: str):
    """Placeholder for retrain trigger — notifies Admin and schedules training job."""
    logger.info("retrain_triggered", asset_id=asset_id, model_type=model_type)
    # In production: dispatch training job, notify Admin via WS/email
    return {"status": "retrain_scheduled", "asset_id": asset_id, "model_type": model_type}

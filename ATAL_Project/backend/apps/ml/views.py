from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.ml.models import MLModel, MLPrediction
from apps.ml.serializers import MLPredictionSerializer
from apps.assets.models import Asset
from apps.users.permissions import IsAdmin


class MLPredictionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MLPredictionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = MLPrediction.objects.select_related("model", "asset")
        asset_id = self.request.query_params.get("asset_id")
        model_type = self.request.query_params.get("model_type")
        if asset_id:
            qs = qs.filter(asset_id=asset_id)
        if model_type:
            qs = qs.filter(model__model_type=model_type)
        return qs

    def retrieve(self, request, *args, **kwargs):
        task_id = kwargs.get("pk")
        from celery.result import AsyncResult
        result = AsyncResult(task_id)
        if result.ready():
            return Response({"status": result.status, "result": result.result})
        return Response({"status": result.status, "result": None})


class MLPredictView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, asset_id, model_type):
        from apps.ml.inference import run_asset_inference, compute_shap_values
        asset = get_object_or_404(Asset, pk=asset_id)
        features = request.data.get("features", {})
        result = run_asset_inference(str(asset.id), model_type, features)
        shap_vals = compute_shap_values(str(asset.id), model_type, features)
        return Response({**result, "shap_values": shap_vals})


class MLPredictAsyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, asset_id, model_type):
        from apps.ml.tasks import run_asset_inference_task
        task = run_asset_inference_task.apply_async(args=[str(asset_id), model_type])
        return Response({"task_id": task.id, "status": "queued"}, status=status.HTTP_202_ACCEPTED)


class MLPredictionExplainView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        pred = get_object_or_404(MLPrediction, pk=pk)
        if pred.shap_values:
            return Response(pred.shap_values)
        from apps.ml.inference import compute_shap_values
        shap_vals = compute_shap_values(
            str(pred.asset_id), pred.model.model_type, pred.input_features
        )
        if shap_vals:
            pred.shap_values = shap_vals
            pred.save(update_fields=["shap_values"])
        return Response(shap_vals or {"detail": "SHAP not available for this model."})


class ModelStatusView(APIView):
    """
    GET /api/v1/ml/models/status/
    Returns current production model registry: asset_type → model_type → {version, metrics, artifact_ok}
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from pathlib import Path
        production = MLModel.objects.filter(status="production").order_by("name", "-created_at")
        seen = set()
        registry = {}
        for rec in production:
            key = (rec.name, rec.model_type)
            if key in seen:
                continue
            seen.add(key)
            # Derive asset_type from name: "{asset_type}_{model_type}"
            parts = rec.name.split("_", 1)
            asset_type = parts[0] if parts else rec.name
            artifact_exists = Path(rec.artifact_path).exists() if rec.artifact_path else False
            if asset_type not in registry:
                registry[asset_type] = {}
            registry[asset_type][rec.model_type] = {
                "name": rec.name,
                "version": rec.version,
                "algorithm": rec.algorithm,
                "artifact_path": rec.artifact_path,
                "artifact_ok": artifact_exists,
                "training_date": rec.training_date.isoformat() if rec.training_date else None,
                "metrics": {k: v for k, v in rec.training_metrics.items() if k != "feature_names"},
            }
        return Response(registry)


class RetrainView(APIView):
    """
    POST /api/v1/ml/retrain/
    Body: {"asset_types": ["SRF", "HHPD"], "rich": true, "n_scenarios": 1000}
    Admin only — triggers async retrain Celery task.
    """
    permission_classes = [IsAdmin]

    def post(self, request):
        from apps.ml.tasks import generate_dataset_and_retrain
        asset_types = request.data.get("asset_types", None)
        rich = bool(request.data.get("rich", True))
        n_scenarios = int(request.data.get("n_scenarios", 1000))

        task = generate_dataset_and_retrain.apply_async(
            kwargs={
                "asset_types": asset_types,
                "n_scenarios": n_scenarios,
                "rich": rich,
            }
        )
        return Response(
            {
                "task_id": task.id,
                "status": "queued",
                "asset_types": asset_types or "ALL",
                "n_scenarios": n_scenarios,
                "rich": rich,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class RetrainStatusView(APIView):
    """GET /api/v1/ml/retrain/{task_id}/ — poll retrain task status."""
    permission_classes = [IsAdmin]

    def get(self, request, task_id):
        from celery.result import AsyncResult
        result = AsyncResult(task_id)
        data = {
            "task_id": task_id,
            "status": result.status,
            "result": result.result if result.ready() else None,
        }
        return Response(data)


class CompetitionInferView(APIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request):
        from apps.ml.competition import run_competition_inference
        train_file = request.FILES.get("train")
        test_file = request.FILES.get("test")
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tf:
            tf.write(train_file.read())
            train_path = tf.name
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tf:
            tf.write(test_file.read())
            test_path = tf.name
        try:
            df = run_competition_inference(train_path, test_path)
            return Response(df.to_dict(orient="records"))
        finally:
            os.unlink(train_path)
            os.unlink(test_path)


class CrossStageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, asset_id):
        from apps.ml.cross_stage import get_cross_stage_correlations
        data = get_cross_stage_correlations(asset_id)
        return Response(data)

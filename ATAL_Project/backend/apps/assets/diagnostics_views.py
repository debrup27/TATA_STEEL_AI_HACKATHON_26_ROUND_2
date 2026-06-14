from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.assets.models import Asset
from apps.assets.diagnostics_service import build_diagnostic
from apps.assets.plant_snapshot import build_plant_snapshot
from apps.agents.diagnostics_insight import (
  generate_rca_overview_insight,
  generate_defect_correlation_insight,
)


class DiagnosticsListView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    factory_id = request.query_params.get("factory_id")
    snap = build_plant_snapshot(factory_id=factory_id)
    return Response({"assets": snap["assets"], "count": snap["count"]})


class DiagnosticsDetailView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, asset_id):
    asset = get_object_or_404(Asset.objects.select_related("factory"), pk=asset_id)
    return Response(build_diagnostic(asset))


class DiagnosticsRefreshView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request, asset_id):
    from apps.ml.tasks import run_all_asset_models
    from apps.consolidation.tasks import run_consolidation

    get_object_or_404(Asset, pk=asset_id)
    ml_task = run_all_asset_models.apply_async(args=[str(asset_id)])
    cons_task = run_consolidation.apply_async(args=[str(asset_id)])
    return Response(
      {
        "asset_id": str(asset_id),
        "ml_task_id": ml_task.id,
        "consolidation_task_id": cons_task.id,
        "status": "queued",
      },
      status=202,
    )


class DiagnosticsRcaInsightView(APIView):
  """POST — inline RCA overview insight (0.8b routes → MANAS 9B answers, no chat session)."""

  permission_classes = [IsAuthenticated]

  def post(self, request, asset_id):
    asset = get_object_or_404(Asset.objects.select_related("factory"), pk=asset_id)
    diag = build_diagnostic(asset)

    if diag.get("isNormalOperation"):
      return Response({"error": "asset is in normal operation — no RCA to analyse"}, status=400)
    if not diag.get("rootCauses"):
      return Response({"error": "no root causes available"}, status=400)

    try:
      result = generate_rca_overview_insight(
        asset_name=asset.name,
        factory=asset.factory.name,
        stage=diag.get("stage", asset.asset_type),
        probable_fault=diag.get("probableFault", ""),
        health=int(diag.get("health", 0)),
        rul_days=diag.get("rulDays"),
        root_causes=diag.get("rootCauses", []),
        sensors=diag.get("sensors", []),
        early_warning=diag.get("earlyWarning"),
      )
    except Exception as exc:
      return Response({"error": f"insight unavailable: {exc}"}, status=503)

    return Response({
      "asset_id": str(asset.id),
      "insight_angle": result["insight_angle"],
      "insight": result["insight"],
      "router": result["router"],
    })


class DiagnosticsDefectInsightView(APIView):
  """POST — inline process-defect correlation insight (no chat session)."""

  permission_classes = [IsAuthenticated]

  def post(self, request, asset_id):
    asset = get_object_or_404(Asset.objects.select_related("factory"), pk=asset_id)
    diag = build_diagnostic(asset)

    if diag.get("isNormalOperation"):
      return Response({"error": "asset is in normal operation — no defects to correlate"}, status=400)
    if not diag.get("processDefects"):
      return Response({"error": "no process defects available"}, status=400)

    try:
      result = generate_defect_correlation_insight(
        asset_name=asset.name,
        factory=asset.factory.name,
        stage=diag.get("stage", asset.asset_type),
        probable_fault=diag.get("probableFault", ""),
        process_defects=diag.get("processDefects", []),
        sensors=diag.get("sensors", []),
        cascade_risk=diag.get("cascadeRisk"),
      )
    except Exception as exc:
      return Response({"error": f"insight unavailable: {exc}"}, status=503)

    return Response({
      "asset_id": str(asset.id),
      "insight_angle": result["insight_angle"],
      "insight": result["insight"],
      "router": result["router"],
    })

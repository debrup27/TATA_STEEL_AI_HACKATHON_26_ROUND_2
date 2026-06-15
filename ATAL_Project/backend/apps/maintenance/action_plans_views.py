from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404

from apps.maintenance.action_plans import list_action_plans, build_action_plan
from apps.maintenance.tasks import get_regen_status, regenerate_asset_plan_sync
from apps.assets.models import Asset


class ActionPlansListView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    factory_id = request.query_params.get("factory_id")
    plans = list_action_plans(factory_id=factory_id)
    regen = get_regen_status()
    return Response({"plans": plans, "count": len(plans), "regeneration": regen})


class ActionPlanDetailView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, asset_id):
    asset = get_object_or_404(Asset.objects.select_related("factory"), pk=asset_id)
    return Response(build_action_plan(asset))


class ActionPlanRegenerateView(APIView):
  """POST — regenerate short maintenance plan inline (Ollama on django-backend, not Celery)."""

  permission_classes = [IsAuthenticated]

  def post(self, request, asset_id):
    asset = get_object_or_404(Asset, pk=asset_id)
    try:
      result = regenerate_asset_plan_sync(str(asset.id), trigger="manual")
      plan = build_action_plan(asset)
      return Response({**result, "status": "complete", "plan": plan}, status=status.HTTP_200_OK)
    except Exception as exc:
      return Response(
        {"status": "error", "error": str(exc)},
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
      )


class WorkOrderGenerateView(APIView):
  """POST — generate a qwen-drafted maintenance work order for the asset from live SANSAD feeds."""

  permission_classes = [IsAuthenticated]

  def post(self, request, asset_id):
    asset = get_object_or_404(Asset, pk=asset_id)
    try:
      from apps.maintenance.work_order_gen import generate_work_order_sync

      wo = generate_work_order_sync(str(asset.id), user=request.user)
      return Response({"status": "complete", "work_order": wo}, status=status.HTTP_200_OK)
    except Exception as exc:
      return Response(
        {"status": "error", "error": str(exc)},
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
      )


class MaintenanceRegenerationStatusView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    return Response(get_regen_status())


class MaintenanceTaskStatusView(APIView):
  """GET — legacy Celery task poll (manual regen no longer uses Celery)."""

  permission_classes = [IsAuthenticated]

  def get(self, request, task_id):
    from celery.result import AsyncResult

    result = AsyncResult(task_id)
    celery_status = result.status or "PENDING"
    ready = result.ready()
    successful = result.successful() if ready else False
    failed = result.failed() if ready else False

    payload = {
      "task_id": task_id,
      "status": "SUCCESS" if successful else "FAILURE" if failed else celery_status,
      "celery_status": celery_status,
      "ready": ready,
      "result": result.result if successful else None,
      "error": str(result.result) if failed else None,
    }
    return Response(payload)

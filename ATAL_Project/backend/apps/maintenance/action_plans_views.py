from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.maintenance.action_plans import list_action_plans, build_action_plan
from apps.assets.models import Asset
from django.shortcuts import get_object_or_404


class ActionPlansListView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request):
    factory_id = request.query_params.get("factory_id")
    plans = list_action_plans(factory_id=factory_id)
    return Response({"plans": plans, "count": len(plans)})


class ActionPlanDetailView(APIView):
  permission_classes = [IsAuthenticated]

  def get(self, request, asset_id):
    asset = get_object_or_404(Asset.objects.select_related("factory"), pk=asset_id)
    plan = build_action_plan(asset)
    if not plan:
      return Response({"detail": "No action plan available for this asset."}, status=404)
    return Response(plan)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.twins.models import AssetTwinState, TwinStateHistory
from apps.twins.serializers import AssetTwinStateSerializer, TwinStateHistorySerializer


class TwinStateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, asset_id):
        twin = get_object_or_404(AssetTwinState, asset_id=asset_id)
        return Response(AssetTwinStateSerializer(twin).data)


class TwinHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, asset_id):
        from_dt = request.query_params.get("from")
        to_dt = request.query_params.get("to")
        fields = request.query_params.get("fields", "").split(",")

        qs = TwinStateHistory.objects.filter(asset_id=asset_id).order_by("-time")
        if from_dt:
            qs = qs.filter(time__gte=from_dt)
        if to_dt:
            qs = qs.filter(time__lte=to_dt)
        qs = qs[:500]
        return Response(TwinStateHistorySerializer(qs, many=True).data)

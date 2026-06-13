from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from apps.alerts.models import AlarmEvent
from apps.assets.models import Asset


class AlarmEventSerializer:
    @staticmethod
    def serialize(qs):
        from datetime import datetime
        return [
            {
                "id": str(a.id),
                "asset_id": str(a.asset_id),
                "asset_name": a.asset.name,
                "alarm_type": a.alarm_type,
                "severity": a.severity,
                "message": a.message,
                "value_at_alarm": a.value_at_alarm,
                "threshold_breached": a.threshold_breached,
                "iso_standard_ref": a.iso_standard_ref,
                "acknowledged": a.acknowledged,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            }
            for a in qs
        ]


class AlarmEventView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AlarmEvent.objects.select_related("asset").order_by("-created_at")
        asset_id = request.query_params.get("asset_id")
        severity = request.query_params.get("severity")
        acknowledged = request.query_params.get("acknowledged")

        if asset_id:
            qs = qs.filter(asset_id=asset_id)
        if severity:
            qs = qs.filter(severity=severity)
        if acknowledged is not None:
            qs = qs.filter(acknowledged=acknowledged.lower() == "true")

        qs = qs[:100]
        return Response(AlarmEventSerializer.serialize(qs))


class AlarmAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        alarm = get_object_or_404(AlarmEvent, pk=pk)
        alarm.acknowledged = True
        alarm.acknowledged_by = request.user
        alarm.save(update_fields=["acknowledged", "acknowledged_by"])
        return Response({"status": "acknowledged"})


class ExternalAlertIngestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        asset_id = request.data.get("asset_id")
        asset = get_object_or_404(Asset, pk=asset_id)
        AlarmEvent.objects.create(
            asset=asset,
            alarm_type=request.data.get("alarm_type", "external"),
            severity=request.data.get("severity", "warning"),
            message=request.data.get("message", "External alert"),
            value_at_alarm=request.data.get("value"),
            threshold_breached=request.data.get("threshold"),
            iso_standard_ref=request.data.get("iso_standard_ref", ""),
        )
        return Response({"status": "created"}, status=status.HTTP_201_CREATED)

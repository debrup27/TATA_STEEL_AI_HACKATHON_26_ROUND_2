from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.maintenance.models import MaintenanceEvent, DelayLog, WorkOrder, FaultMessage
from apps.maintenance.serializers import (
    MaintenanceEventSerializer, DelayLogSerializer, WorkOrderSerializer, FaultMessageSerializer
)
from apps.users.permissions import IsSupervisor


class MaintenanceEventViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceEventSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["asset", "event_type"]

    def get_queryset(self):
        return MaintenanceEvent.objects.select_related("asset", "technician").order_by("-completed_date")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsSupervisor()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        event = serializer.save(technician=self.request.user)
        # Trigger auto digital logbook drafting
        from apps.maintenance.tasks import draft_logbook_entry
        draft_logbook_entry.apply_async(args=[str(event.id)])


class DelayLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DelayLog.objects.select_related("asset", "factory").order_by("-start_time")
    serializer_class = DelayLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["asset", "factory"]


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.select_related("asset", "created_by").order_by("priority", "-created_at")
    serializer_class = WorkOrderSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["asset", "status", "priority"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class FaultMessageIngestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.assets.models import Asset
        from apps.alerts.models import AlarmEvent
        asset = get_object_or_404(Asset, pk=request.data.get("asset_id"))
        msg = FaultMessage.objects.create(
            asset=asset,
            fault_code=request.data.get("fault_code", ""),
            source_system=request.data.get("source_system", "PLC"),
            message=request.data.get("message", ""),
            timestamp=request.data.get("timestamp"),
            severity=request.data.get("severity", "warning"),
        )
        # Also create an alarm event
        AlarmEvent.objects.create(
            asset=asset,
            alarm_type=f"fault_{msg.fault_code}",
            severity=msg.severity,
            message=msg.message,
        )
        return Response(FaultMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class FailureReportIngestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.assets.models import Asset
        from apps.rag.tasks import ingest_maintenance_log
        asset = get_object_or_404(Asset, pk=request.data.get("asset_id"))
        event = MaintenanceEvent.objects.create(
            asset=asset,
            event_type="corrective",
            description=request.data.get("description", ""),
            outcome=request.data.get("outcome", ""),
            iso14224_classification=request.data.get("iso14224_classification", ""),
        )
        ingest_maintenance_log.apply_async(args=[str(event.id)])
        return Response(MaintenanceEventSerializer(event).data, status=status.HTTP_201_CREATED)


class MaintenancePlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, asset_id):
        from apps.maintenance.services import MaintenancePlanService
        from apps.assets.models import Asset
        asset = get_object_or_404(Asset, pk=asset_id)
        plan = MaintenancePlanService.generate(asset)
        return Response(plan)

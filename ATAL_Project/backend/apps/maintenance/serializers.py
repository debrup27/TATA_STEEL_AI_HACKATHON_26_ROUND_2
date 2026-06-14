from rest_framework import serializers
from apps.maintenance.models import MaintenanceEvent, DelayLog, WorkOrder, FaultMessage


class MaintenanceEventSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True)

    class Meta:
        model = MaintenanceEvent
        fields = [f.name for f in MaintenanceEvent._meta.fields] + ["asset_name"]


class DelayLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DelayLog
        fields = "__all__"


class WorkOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrder
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class FaultMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaultMessage
        fields = "__all__"

from rest_framework import serializers
from apps.twins.models import AssetTwinState, TwinStateHistory


class AssetTwinStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetTwinState
        fields = ["id", "asset", "state", "health_score", "active_alerts", "updated_at"]


class TwinStateHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TwinStateHistory
        fields = ["time", "asset", "state", "health_score"]

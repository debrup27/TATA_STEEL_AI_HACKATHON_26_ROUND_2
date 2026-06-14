from rest_framework import serializers
from apps.assets.models import Factory, Asset, SensorDefinition, SparesPart
from apps.twins.models import AssetTwinState
from apps.ml.models import MLPrediction


class SensorDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorDefinition
        fields = [
            "id", "asset", "sensor_name", "sensor_type", "unit",
            "normal_min", "normal_max", "alert_threshold", "trip_threshold",
            "iso_standard_ref", "sampling_freq_hz",
        ]


class SparePartSerializer(serializers.ModelSerializer):
    class Meta:
        model = SparesPart
        fields = [
            "id", "asset", "part_name", "part_number", "quantity_in_stock",
            "reorder_level", "lead_time_days", "unit_cost", "supplier",
        ]


class AssetSerializer(serializers.ModelSerializer):
    sensor_count = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            "id", "factory", "name", "asset_type", "iso_standards",
            "oem_manual_urls", "installed_at", "criticality_level", "sensor_count",
        ]

    def get_sensor_count(self, obj):
        return obj.sensors.count()


class AssetHealthSerializer(serializers.Serializer):
    asset_id = serializers.UUIDField()
    name = serializers.CharField()
    health_score = serializers.FloatField()
    rul_hours = serializers.FloatField(allow_null=True)
    status = serializers.CharField()
    active_alerts_count = serializers.IntegerField()
    anomaly_score = serializers.FloatField(required=False, allow_null=True)
    fault_classification = serializers.IntegerField(required=False, allow_null=True)
    ml_source = serializers.CharField(required=False, allow_null=True)
    campaign_hours = serializers.FloatField(required=False)
    last_maintenance = serializers.DictField(required=False, allow_null=True)
    twin_state_summary = serializers.DictField(required=False)
    last_prediction_time = serializers.DateTimeField(allow_null=True, required=False)


class FactorySerializer(serializers.ModelSerializer):
    asset_count = serializers.SerializerMethodField()

    class Meta:
        model = Factory
        fields = ["id", "org", "name", "code", "location", "metadata", "asset_count"]

    def get_asset_count(self, obj):
        return obj.assets.count()


class FactoryHealthSerializer(serializers.Serializer):
    factory_id = serializers.UUIDField()
    name = serializers.CharField()
    health_score = serializers.FloatField()
    asset_rankings = AssetHealthSerializer(many=True)
    bottleneck_asset_id = serializers.UUIDField(allow_null=True)
    critical_alerts_count = serializers.IntegerField()

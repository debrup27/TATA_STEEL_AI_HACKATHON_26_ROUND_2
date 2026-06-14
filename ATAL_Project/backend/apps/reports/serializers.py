from rest_framework import serializers
from apps.reports.models import MaintenanceReport


class ReportListSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source="asset.name", read_only=True)
    asset_code = serializers.CharField(source="asset.asset_type", read_only=True)
    factory_name = serializers.CharField(source="asset.factory.name", read_only=True)

    class Meta:
        model = MaintenanceReport
        fields = [
            "id",
            "asset",
            "asset_name",
            "asset_code",
            "factory_name",
            "created_at",
            "source",
            "report_type",
            "title",
            "risk_level",
            "urgency_score",
            "feedback_status",
            "diagnosis",
            "recommendations",
            "immediate_actions",
            "report_text",
        ]


class ReportDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceReport
        fields = "__all__"

from rest_framework import serializers
from apps.reports.models import MaintenanceReport


class ReportListSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceReport
        fields = [
            "id", "asset", "created_at", "source", "risk_level",
            "urgency_score", "feedback_status", "diagnosis",
        ]


class ReportDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceReport
        fields = "__all__"

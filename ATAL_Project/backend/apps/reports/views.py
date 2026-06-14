from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from apps.reports.models import MaintenanceReport
from apps.reports.serializers import ReportListSerializer, ReportDetailSerializer
from apps.feedback.models import Feedback


class MaintenanceReportViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    filterset_fields = ["asset", "risk_level", "source", "feedback_status", "report_type"]

    def get_queryset(self):
        qs = MaintenanceReport.objects.select_related("asset", "asset__factory", "created_by").order_by("-created_at")
        report_type = self.request.query_params.get("report_type")
        if report_type:
            qs = qs.filter(report_type=report_type)
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ReportDetailSerializer
        return ReportListSerializer

    @action(detail=True, methods=["post"], url_path="feedback")
    def submit_feedback(self, request, pk=None):
        report = self.get_object()
        feedback_type = request.data.get("feedback_type")
        if feedback_type not in [c[0] for c in Feedback.FeedbackType.choices]:
            return Response({"error": "Invalid feedback_type"}, status=400)

        feedback = Feedback.objects.create(
            report=report,
            user=request.user,
            feedback_type=feedback_type,
            corrected_values=request.data.get("corrected_values", {}),
        )

        report.feedback_status = {
            "confirm": "accepted",
            "reject": "rejected",
            "correct": "corrected",
        }.get(feedback_type, "pending")
        report.save(update_fields=["feedback_status"])

        # Trigger RAG update for corrections
        if feedback_type in ("correct", "confirm"):
            from apps.rag.tasks import update_from_feedback
            update_from_feedback.apply_async(args=[str(feedback.id)])

        return Response({"status": "feedback_recorded", "feedback_id": str(feedback.id)})

    @action(detail=True, url_path="urgency")
    def urgency(self, request, pk=None):
        report = self.get_object()
        return Response({
            "report_id": str(report.id),
            "urgency_score": report.urgency_score,
            "risk_level": report.risk_level,
        })

    @action(detail=True, url_path="summary")
    def summary(self, request, pk=None):
        report = self.get_object()
        role = request.user.role

        if role == "technician":
            return Response({
                "diagnosis": report.diagnosis,
                "recommendations": report.recommendations,
                "immediate_actions": report.immediate_actions,
                "risk_level": report.risk_level,
            })
        else:
            return Response({
                "diagnosis": report.diagnosis,
                "risk_level": report.risk_level,
                "urgency_score": report.urgency_score,
                "spare_strategy": report.spare_strategy,
                "report_text": report.report_text,
            })


class AlertReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.alerts.models import AlarmEvent
        from apps.assets.models import Asset
        asset = get_object_or_404(Asset, pk=request.data.get("asset_id"))
        alarms = AlarmEvent.objects.filter(asset=asset, acknowledged=False).order_by("-created_at")[:50]

        report = MaintenanceReport.objects.create(
            asset=asset,
            source=MaintenanceReport.Source.AI_GENERATED,
            report_type=MaintenanceReport.ReportType.ABNORMAL_ALERT,
            title=f"Abnormal Alert — {asset.name}",
            diagnosis=f"Active abnormal alerts: {alarms.count()}",
            report_text="\n".join([f"[{a.severity.upper()}] {a.message}" for a in alarms]),
            risk_level="high" if alarms.filter(severity__in=["critical", "trip"]).exists() else "medium",
        )
        return Response(ReportDetailSerializer(report).data, status=status.HTTP_201_CREATED)

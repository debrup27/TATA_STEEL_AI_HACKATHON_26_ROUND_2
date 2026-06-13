from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.feedback.models import Feedback
from apps.reports.models import MaintenanceReport


class FeedbackCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, report_id):
        try:
            report = MaintenanceReport.objects.get(id=report_id)
        except MaintenanceReport.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        fb_type = request.data.get("feedback_type")
        if fb_type not in ("confirm", "correct", "reject"):
            return Response({"error": "invalid feedback_type"}, status=status.HTTP_400_BAD_REQUEST)

        feedback = Feedback.objects.create(
            report=report,
            user=request.user,
            feedback_type=fb_type,
            corrected_values=request.data.get("corrected_values", {}),
        )

        # Update report feedback status
        mapping = {"confirm": "accepted", "reject": "rejected", "correct": "corrected"}
        report.feedback_status = mapping[fb_type]
        report.save(update_fields=["feedback_status"])

        # Queue Weaviate update for corrections (deferred to Phase 3)
        return Response({"id": str(feedback.id), "status": "recorded"}, status=status.HTTP_201_CREATED)

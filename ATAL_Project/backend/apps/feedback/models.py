import uuid
from django.db import models
from apps.reports.models import MaintenanceReport
from apps.users.models import User


class Feedback(models.Model):
    class FeedbackType(models.TextChoices):
        CONFIRM = "confirm", "Confirm"
        CORRECT = "correct", "Correct"
        REJECT = "reject", "Reject"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(
        MaintenanceReport, on_delete=models.CASCADE, related_name="feedbacks"
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="feedbacks")
    feedback_type = models.CharField(max_length=10, choices=FeedbackType.choices)
    corrected_values = models.JSONField(default=dict, blank=True)
    chroma_updated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback_feedback"

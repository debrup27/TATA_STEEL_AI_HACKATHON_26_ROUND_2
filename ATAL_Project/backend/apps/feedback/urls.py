from django.urls import path
from apps.feedback.views import FeedbackCreateView

urlpatterns = [
    path("reports/<uuid:report_id>/feedback/", FeedbackCreateView.as_view()),
]

from django.urls import path
from apps.alerts.views import AlarmEventView, AlarmAcknowledgeView, ExternalAlertIngestView

urlpatterns = [
    path("", AlarmEventView.as_view()),
    path("<uuid:pk>/acknowledge/", AlarmAcknowledgeView.as_view()),
    path("external/", ExternalAlertIngestView.as_view()),
]

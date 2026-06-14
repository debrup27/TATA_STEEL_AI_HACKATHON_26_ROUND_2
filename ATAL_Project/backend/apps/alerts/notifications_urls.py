from django.urls import path
from apps.alerts.notifications_views import NotificationFeedView

urlpatterns = [
  path("feed/", NotificationFeedView.as_view()),
]

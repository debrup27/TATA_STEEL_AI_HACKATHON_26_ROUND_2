from django.urls import path
from apps.assets.views import HealthCheckView, ReadyCheckView

urlpatterns = [
    path("", HealthCheckView.as_view(), name="health-check"),
    path("ready/", ReadyCheckView.as_view(), name="ready-check"),
]

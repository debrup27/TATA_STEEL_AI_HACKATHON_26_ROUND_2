from django.urls import path
from apps.assets.views import HealthCheckView

urlpatterns = [
    path("", HealthCheckView.as_view(), name="health-check"),
]

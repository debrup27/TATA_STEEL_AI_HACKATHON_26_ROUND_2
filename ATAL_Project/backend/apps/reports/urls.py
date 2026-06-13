from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.reports.views import MaintenanceReportViewSet, AlertReportView

router = DefaultRouter()
router.register("", MaintenanceReportViewSet, basename="reports")

urlpatterns = router.urls + [
    path("alert-report/", AlertReportView.as_view()),
]

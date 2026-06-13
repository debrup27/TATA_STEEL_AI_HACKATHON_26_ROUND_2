from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.maintenance.views import (
    MaintenanceEventViewSet, DelayLogViewSet, WorkOrderViewSet,
    FaultMessageIngestView, FailureReportIngestView,
)

router = DefaultRouter()
router.register("events", MaintenanceEventViewSet, basename="maintenance-events")
router.register("delay-logs", DelayLogViewSet, basename="delay-logs")
router.register("work-orders", WorkOrderViewSet, basename="work-orders")

urlpatterns = router.urls + [
    path("fault-messages/", FaultMessageIngestView.as_view()),
    path("failure-reports/", FailureReportIngestView.as_view()),
]

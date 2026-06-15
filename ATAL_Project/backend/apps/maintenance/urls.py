from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.maintenance.views import (
    MaintenanceEventViewSet, DelayLogViewSet, WorkOrderViewSet,
    FaultMessageIngestView, FailureReportIngestView,
)
from apps.maintenance.action_plans_views import (
    ActionPlansListView,
    ActionPlanDetailView,
    ActionPlanRegenerateView,
    MaintenanceRegenerationStatusView,
    MaintenanceTaskStatusView,
    WorkOrderGenerateView,
)

router = DefaultRouter()
router.register("events", MaintenanceEventViewSet, basename="maintenance-events")
router.register("delay-logs", DelayLogViewSet, basename="delay-logs")
router.register("work-orders", WorkOrderViewSet, basename="work-orders")

urlpatterns = router.urls + [
    path("work-orders/<uuid:asset_id>/generate/", WorkOrderGenerateView.as_view()),
    path("action-plans/", ActionPlansListView.as_view()),
    path("action-plans/regeneration-status/", MaintenanceRegenerationStatusView.as_view()),
    path("action-plans/task-status/<str:task_id>/", MaintenanceTaskStatusView.as_view()),
    path("action-plans/<uuid:asset_id>/regenerate/", ActionPlanRegenerateView.as_view()),
    path("action-plans/<uuid:asset_id>/", ActionPlanDetailView.as_view()),
    path("fault-messages/", FaultMessageIngestView.as_view()),
    path("failure-reports/", FailureReportIngestView.as_view()),
]

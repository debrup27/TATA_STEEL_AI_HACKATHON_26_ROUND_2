from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", include("apps.assets.urls.health")),
    path("api/v1/auth/", include("apps.users.urls.auth")),
    path("api/v1/admin/", include("apps.users.urls.admin")),
    path("api/v1/factories/", include("apps.assets.urls.factories")),
    path("api/v1/assets/", include("apps.assets.urls.assets")),
    path("api/v1/sensors/", include("apps.assets.urls.sensors")),
    path("api/v1/spares/", include("apps.assets.urls.spares")),
    path("api/v1/twins/", include("apps.twins.urls")),
    path("api/v1/telemetry/", include("apps.telemetry.urls")),
    path("api/v1/ml/", include("apps.ml.urls")),
    path("api/v1/consolidate/", include("apps.consolidation.urls")),
    path("api/v1/alerts/", include("apps.alerts.urls")),
    path("api/v1/maintenance/", include("apps.maintenance.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/rag/", include("apps.rag.urls")),
    path("api/v1/chat/", include("apps.agents.urls")),
    path("api/v1/plant/", include("apps.consolidation.plant_urls")),
    path("api/v1/", include("apps.feedback.urls")),
    path("api/v1/simulate/", include("apps.assets.urls.simulate")),
]

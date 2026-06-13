from rest_framework.routers import DefaultRouter
from apps.assets.views import SensorDefinitionViewSet

router = DefaultRouter()
router.register("", SensorDefinitionViewSet, basename="sensor")
urlpatterns = router.urls

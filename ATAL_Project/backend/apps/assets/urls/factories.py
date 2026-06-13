from rest_framework.routers import DefaultRouter
from apps.assets.views import FactoryViewSet

router = DefaultRouter()
router.register("", FactoryViewSet, basename="factory")
urlpatterns = router.urls

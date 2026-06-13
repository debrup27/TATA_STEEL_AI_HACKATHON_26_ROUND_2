from rest_framework.routers import DefaultRouter
from apps.assets.views import AssetViewSet

router = DefaultRouter()
router.register("", AssetViewSet, basename="asset")
urlpatterns = router.urls

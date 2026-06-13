from rest_framework.routers import DefaultRouter
from apps.assets.views import SparePartViewSet

router = DefaultRouter()
router.register("", SparePartViewSet, basename="spare")
urlpatterns = router.urls

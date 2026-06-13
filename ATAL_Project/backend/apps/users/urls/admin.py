from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.users.views import OrgViewSet, UserAdminViewSet, ModelRegistryViewSet

router = DefaultRouter()
router.register("orgs", OrgViewSet, basename="orgs")
router.register("users", UserAdminViewSet, basename="admin-users")
router.register("model-registry", ModelRegistryViewSet, basename="model-registry")

urlpatterns = router.urls

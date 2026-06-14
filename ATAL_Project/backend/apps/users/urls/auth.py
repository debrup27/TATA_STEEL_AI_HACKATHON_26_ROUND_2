from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.users.views import LogoutView
from apps.users.tokens import ATALTokenObtainPairView

urlpatterns = [
    path("token/", ATALTokenObtainPairView.as_view(), name="token_obtain"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
]

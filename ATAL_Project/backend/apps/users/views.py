from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from apps.users.models import Organization, User
from apps.users.serializers import OrganizationSerializer, UserSerializer, UserCreateSerializer
from apps.users.permissions import IsAdmin
from apps.ml.models import MLModel
from apps.ml.serializers import MLModelSerializer


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


class OrgViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsAdmin]


class UserAdminViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer


class ModelRegistryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MLModel.objects.all().order_by("-created_at")
    serializer_class = MLModelSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        asset_id = self.request.query_params.get("asset_id")
        model_type = self.request.query_params.get("model_type")
        if asset_id:
            qs = qs.filter(asset_id=asset_id)
        if model_type:
            qs = qs.filter(model_type=model_type)
        return qs

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from apps.assets.models import Factory, Asset, SensorDefinition, SparesPart
from apps.assets.serializers import (
    FactorySerializer, FactoryHealthSerializer,
    AssetSerializer, AssetHealthSerializer,
    SensorDefinitionSerializer, SparePartSerializer,
)
from apps.assets.services import FactoryHealthService, AssetHealthService
from apps.users.permissions import IsAdmin, IsSupervisor


class FactoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FactorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "admin":
            return Factory.objects.all()
        return Factory.objects.filter(id__in=user.factory_access)

    @action(detail=True, url_path="health")
    def health(self, request, pk=None):
        factory = get_object_or_404(Factory, pk=pk)
        data = FactoryHealthService.compute(factory)
        return Response(FactoryHealthSerializer(data).data)


class FactoryOnboardView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        from apps.assets.services import FactoryOnboardService
        result = FactoryOnboardService.onboard(request.data)
        return Response(result, status=status.HTTP_201_CREATED)


class AssetViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Asset.objects.select_related("factory")
        if user.role != "admin":
            qs = qs.filter(factory_id__in=user.factory_access)
        factory_id = self.request.query_params.get("factory_id")
        if factory_id:
            qs = qs.filter(factory_id=factory_id)
        return qs

    @action(detail=True, url_path="health")
    def health(self, request, pk=None):
        asset = get_object_or_404(Asset, pk=pk)
        data = AssetHealthService.compute(asset)
        return Response(AssetHealthSerializer(data).data)

    @action(detail=True, url_path="maintenance-plan")
    def maintenance_plan(self, request, pk=None):
        from apps.maintenance.services import MaintenancePlanService
        asset = get_object_or_404(Asset, pk=pk)
        plan = MaintenancePlanService.generate(asset)
        return Response(plan)

    @action(detail=True, url_path="knowledge-base")
    def knowledge_base(self, request, pk=None):
        from apps.assets.services import AssetKnowledgeBaseService
        asset = get_object_or_404(Asset, pk=pk)
        data = AssetKnowledgeBaseService.get(asset)
        return Response(data)


class SensorDefinitionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SensorDefinition.objects.select_related("asset")
    serializer_class = SensorDefinitionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["asset", "sensor_type"]


class SparePartViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SparesPart.objects.select_related("asset")
    serializer_class = SparePartSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["asset"]


class HealthCheckView(APIView):
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok"})

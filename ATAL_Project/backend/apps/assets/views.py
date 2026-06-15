from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from apps.assets.models import Factory, Asset, SensorDefinition, SparesPart
from apps.assets.serializers import (
    FactorySerializer, FactoryHealthSerializer,
    AssetSerializer, AssetHealthSerializer,
    SensorDefinitionSerializer, SparePartSerializer,
)
from apps.assets.services import FactoryHealthService, AssetHealthService
from apps.users.permissions import IsAdmin, IsSupervisor


def _split_factory_access(access: list) -> tuple[list, list]:
    """Split factory_access entries into UUIDs vs factory codes (F1, F2, …)."""
    from uuid import UUID

    uuids: list = []
    codes: list = []
    for entry in access:
        try:
            UUID(str(entry))
            uuids.append(entry)
        except (ValueError, TypeError):
            codes.append(entry)
    return uuids, codes


def _factory_access_filter(access: list, *, id_field: str = "id", code_field: str = "code") -> Q:
    uuids, codes = _split_factory_access(access)
    q = Q()
    if uuids:
        q |= Q(**{f"{id_field}__in": uuids})
    if codes:
        q |= Q(**{f"{code_field}__in": codes})
    return q


class FactoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FactorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "admin":
            return Factory.objects.all()
        access = user.factory_access or []
        return Factory.objects.filter(_factory_access_filter(access))

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
            access = user.factory_access or []
            qs = qs.filter(_factory_access_filter(access, id_field="factory_id", code_field="factory__code"))
        factory_id = self.request.query_params.get("factory_id")
        if factory_id:
            from uuid import UUID
            try:
                UUID(str(factory_id))
                qs = qs.filter(factory_id=factory_id)
            except (ValueError, TypeError):
                qs = qs.filter(factory__code=factory_id)
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


class ReadyCheckView(APIView):
    """Readiness probe — 503 until bootstrap completes (marker file on disk)."""

    permission_classes = []

    def get(self, request):
        import os

        ready_marker = os.environ.get("ATAL_READY_MARKER", "/tmp/atal_backend_ready")
        if not os.path.isfile(ready_marker):
            return Response(
                {"status": "starting", "detail": "Backend bootstrap in progress"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        boot_id = str(int(os.path.getmtime(ready_marker)))
        return Response({"status": "ready", "boot_id": boot_id})


class AssetSimulationView(APIView):
    """
    Simulation control for an asset — inject faults or reset campaign state.
    POST /api/v1/assets/<asset_id>/simulate/
    Body: { "action": "inject_fault" | "reset" | "status", "fault_type": "general" | "thermal" | "bearing" | "crystallization" }
    No migration needed — stores state in AssetTwinState.state JSONField.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, asset_id):
        asset = get_object_or_404(Asset, pk=asset_id)
        from apps.twins.models import AssetTwinState
        twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
        state = twin.state or {}
        return Response({
            "asset_id": str(asset.id),
            "asset_type": asset.asset_type,
            "campaign_hours": state.get("_campaign_hours", 0.0),
            "fault_injected": state.get("_fault_injected", False),
            "fault_type": state.get("_fault_type"),
            "reset_requested": state.get("_reset_requested", False),
            "health_score": twin.health_score,
        })

    def post(self, request, asset_id):
        asset = get_object_or_404(Asset, pk=asset_id)
        action = request.data.get("action", "status")
        fault_type = request.data.get("fault_type", "general")

        from apps.twins.models import AssetTwinState
        twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
        state = dict(twin.state or {})

        if action == "inject_fault":
            state["_fault_injected"] = True
            state["_fault_type"] = fault_type
            twin.state = state
            twin.save(update_fields=["state", "updated_at"])

            # Immediately queue a synthetic batch with fault injection so alerts fire now
            try:
                from apps.synthetic.tasks import generate_batch
                generate_batch.apply_async(args=[str(asset.id)], kwargs={"n_samples": 30})
            except Exception as exc:
                pass  # background; don't block response

            return Response({
                "status": "fault_injection_queued",
                "asset_type": asset.asset_type,
                "fault_type": fault_type,
                "campaign_hours": state.get("_campaign_hours", 0.0),
                "message": f"Fault '{fault_type}' injected for {asset.asset_type}. Next batch will generate anomalous readings and trigger alerts + consolidation.",
            })

        elif action == "reset":
            state["_campaign_hours"] = 0.0
            state["_fault_injected"] = False
            state["_fault_type"] = None
            state["_reset_requested"] = True
            twin.state = state
            twin.health_score = 100.0
            twin.save(update_fields=["state", "health_score", "updated_at"])
            return Response({
                "status": "reset_queued",
                "asset_type": asset.asset_type,
                "message": f"{asset.asset_type} campaign state reset to 0 hours. Health will recover on next ML inference.",
            })

        elif action == "degrade_fast":
            # Jump campaign to 85% of max life for immediate near-critical state
            from apps.synthetic.tasks import CAMPAIGN_MAX
            target = CAMPAIGN_MAX.get(asset.asset_type, 5000.0) * 0.85
            state["_campaign_hours"] = target
            state["_fault_injected"] = True
            state["_fault_type"] = fault_type
            twin.state = state
            twin.save(update_fields=["state", "updated_at"])
            try:
                from apps.synthetic.tasks import generate_batch
                generate_batch.apply_async(args=[str(asset.id)], kwargs={"n_samples": 30})
            except Exception:
                pass
            return Response({
                "status": "fast_degradation_applied",
                "asset_type": asset.asset_type,
                "campaign_hours_set": round(target, 1),
                "message": f"{asset.asset_type} jumped to {round(target,1)}h campaign — critical degradation in next batch.",
            })

        return Response({
            "status": "no_change",
            "campaign_hours": state.get("_campaign_hours", 0.0),
        })


class PlantSimulationView(APIView):
    """
    GET /api/v1/assets/plant-simulation/ — overview of all assets' campaign state.
    POST /api/v1/assets/plant-simulation/ — bulk action (reset_all, degrade_all).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.twins.models import AssetTwinState
        from apps.synthetic.tasks import CAMPAIGN_MAX
        assets = Asset.objects.all()
        result = []
        for asset in assets:
            twin = AssetTwinState.objects.filter(asset=asset).first()
            state = twin.state if twin else {}
            campaign_h = float(state.get("_campaign_hours", 0.0))
            cmax = CAMPAIGN_MAX.get(asset.asset_type, 5000.0)
            result.append({
                "asset_id": str(asset.id),
                "asset_type": asset.asset_type,
                "name": asset.name,
                "campaign_hours": campaign_h,
                "campaign_pct": round(campaign_h / cmax * 100, 1),
                "health_score": twin.health_score if twin else 100.0,
                "fault_injected": state.get("_fault_injected", False),
                "fault_type": state.get("_fault_type"),
            })
        result.sort(key=lambda x: x["health_score"])
        return Response({"assets": result})

    def post(self, request):
        action = request.data.get("action", "status")
        from apps.twins.models import AssetTwinState
        updated = 0
        for asset in Asset.objects.all():
            twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
            state = dict(twin.state or {})
            if action == "reset_all":
                state["_campaign_hours"] = 0.0
                state["_fault_injected"] = False
                state["_fault_type"] = None
                twin.health_score = 100.0
                twin.state = state
                twin.save(update_fields=["state", "health_score", "updated_at"])
                updated += 1
        return Response({"status": action, "assets_updated": updated})

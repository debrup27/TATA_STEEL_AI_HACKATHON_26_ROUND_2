from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.assets.plant_snapshot import build_plant_snapshot


class PlantSnapshotView(APIView):
    """GET /api/v1/plant/snapshot/ — unified diagnostics + sensors for all SANSAD pages."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        factory_id = request.query_params.get("factory_id")
        return Response(build_plant_snapshot(factory_id=factory_id))

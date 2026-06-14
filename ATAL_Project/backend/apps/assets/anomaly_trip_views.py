from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.assets.anomaly_trip import clear_anomaly_trip, trigger_anomaly_trip
from apps.assets.plant_snapshot import build_plant_snapshot


class AnomalyTripView(APIView):
    """POST /api/v1/simulate/trip/ — universal abnormality generator."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        asset_id = request.data.get("asset_id")
        fault_type = request.data.get("fault_type")
        result = trigger_anomaly_trip(
            asset_id=str(asset_id) if asset_id else None,
            fault_type=fault_type,
        )
        snap = build_plant_snapshot()
        result["snapshot"] = {
            "anomaly_flags": snap.get("anomaly_flags"),
            "generated_at": snap.get("generated_at"),
        }
        return Response(result, status=202)


class AnomalyTripClearView(APIView):
    """POST /api/v1/simulate/trip/clear/ — reset injected trips."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        asset_id = request.data.get("asset_id")
        result = clear_anomaly_trip(str(asset_id) if asset_id else None)
        snap = build_plant_snapshot()
        result["snapshot"] = {
            "anomaly_flags": snap.get("anomaly_flags"),
            "generated_at": snap.get("generated_at"),
        }
        return Response(result)

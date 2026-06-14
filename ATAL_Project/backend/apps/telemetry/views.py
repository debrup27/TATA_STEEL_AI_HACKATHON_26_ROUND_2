from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from apps.assets.models import Asset, SensorDefinition
from apps.telemetry.models import SensorReading


class TelemetryIngestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.twins.engine import TwinStateEngine
        from apps.alerts.tasks import evaluate_thresholds

        asset_id = request.data.get("asset_id")
        readings_data = request.data.get("readings", [])

        asset = get_object_or_404(Asset, pk=asset_id)
        sensor_map = {
            str(s.id): s
            for s in SensorDefinition.objects.filter(asset=asset)
        }

        bulk = []
        for r in readings_data:
            sdef = sensor_map.get(str(r.get("sensor_def_id")))
            if not sdef:
                continue
            bulk.append(SensorReading(
                time=r.get("timestamp", timezone.now()),
                asset=asset,
                sensor_def=sdef,
                value=r["value"],
                quality_flag=r.get("quality_flag", 0),
                source=SensorReading.Source.REAL,
                condition_type=r.get("condition_type", ""),
            ))

        SensorReading.objects.bulk_create(bulk, batch_size=500)

        # Async: update twin state + evaluate thresholds
        TwinStateEngine.schedule_update(str(asset.id))
        evaluate_thresholds.apply_async(args=[str(asset.id)])

        return Response({"ingested": len(bulk)}, status=status.HTTP_201_CREATED)


class TelemetryTimeSeriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, asset_id):
        asset = get_object_or_404(Asset, pk=asset_id)
        sensor_name = request.query_params.get("sensor")
        from_dt = request.query_params.get("from", (timezone.now() - timedelta(hours=24)).isoformat())
        # Allow 2 min future buffer — synthetic generator timestamps readings slightly ahead
        to_dt = request.query_params.get("to", (timezone.now() + timedelta(minutes=2)).isoformat())
        limit = int(request.query_params.get("limit", 1000))

        qs = SensorReading.objects.filter(
            asset=asset, time__gte=from_dt, time__lte=to_dt
        )
        if sensor_name:
            qs = qs.filter(sensor_def__sensor_name=sensor_name)

        order = request.query_params.get("order", "desc")
        if order == "asc":
            rows = list(qs.order_by("time")[:limit])
        else:
            # Default: newest readings first (dashboards / factory canvas)
            rows = list(qs.order_by("-time")[:limit])

        data = [
            {
                "time": r.time.isoformat(),
                "sensor_name": r.sensor_def.sensor_name,
                "value": r.value,
                "unit": r.sensor_def.unit,
                "quality_flag": r.quality_flag,
            }
            for r in rows
        ]
        return Response({"asset_id": str(asset_id), "readings": data, "count": len(data)})


class TelemetrySnapshotView(APIView):
    """
    GET /api/v1/telemetry/snapshot/?factory=<id>
    Returns the latest reading per sensor for all assets in a factory.
    Used by the 10s frontend poll — much cheaper than per-asset fetches.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.assets.models import Factory
        factory_id = request.query_params.get("factory")
        if not factory_id:
            return Response({"error": "factory param required"}, status=400)

        factory = get_object_or_404(Factory, pk=factory_id)
        since = timezone.now() - timedelta(hours=2)
        until = timezone.now() + timedelta(minutes=2)

        assets = Asset.objects.filter(factory=factory)
        result: dict[str, list] = {}

        for asset in assets:
            sensor_defs = SensorDefinition.objects.filter(asset=asset)
            readings = []
            for sdef in sensor_defs:
                reading = (
                    SensorReading.objects
                    .filter(asset=asset, sensor_def=sdef, time__gte=since, time__lte=until)
                    .order_by("-time")
                    .first()
                )
                if reading:
                    readings.append({
                        "sensor_name": sdef.sensor_name,
                        "value": reading.value,
                        "unit": sdef.unit or "",
                        "time": reading.time.isoformat(),
                        "quality_flag": reading.quality_flag,
                    })
            if readings:
                result[str(asset.id)] = readings

        return Response({"snapshot": result, "timestamp": timezone.now().isoformat()})

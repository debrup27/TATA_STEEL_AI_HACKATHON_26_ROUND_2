"""
Broadcast latest sensor readings to /ws/telemetry subscribers.
"""
import logging
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


def _status_from_value(value: float, normal_min: float | None, normal_max: float | None, alert: float | None) -> str:
    if alert is not None and value >= alert:
        return "critical"
    if normal_max is not None and value > normal_max:
        return "warning"
    if normal_min is not None and value < normal_min:
        return "warning"
    return "nominal"


@shared_task(name="apps.telemetry.broadcast_cells")
def broadcast_telemetry_cells():
    from apps.assets.models import Asset, SensorDefinition
    from apps.telemetry.models import SensorReading

    channel_layer = get_channel_layer()
    if not channel_layer:
        return {"broadcast": 0}

    since = timezone.now() - timedelta(hours=1)
    cells = []

    for asset in Asset.objects.all()[:12]:
        for sdef in SensorDefinition.objects.filter(asset=asset):
            reading = (
                SensorReading.objects.filter(asset=asset, sensor_def=sdef, time__gte=since)
                .order_by("-time")
                .first()
            )
            if not reading:
                continue
            status = _status_from_value(
                reading.value,
                sdef.normal_min,
                sdef.normal_max,
                sdef.alert_threshold,
            )
            unit = sdef.unit or ""
            cells.append({
                "label": sdef.sensor_name[:12].upper(),
                "value": f"{reading.value:.1f}{unit}",
                "status": status,
                "asset_id": str(asset.id),
                "sensor_name": sdef.sensor_name,
            })

    if not cells:
        return {"broadcast": 0}

    payload = {"type": "telemetry_update", "cells": cells, "timestamp": timezone.now().isoformat()}
    async_to_sync(channel_layer.group_send)("telemetry_broadcast", payload)
    logger.debug("telemetry_broadcast cells=%d", len(cells))
    return {"broadcast": len(cells)}

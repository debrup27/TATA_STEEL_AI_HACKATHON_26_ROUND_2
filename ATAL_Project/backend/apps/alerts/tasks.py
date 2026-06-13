"""
AlertEvaluationTask — evaluates SensorDefinition thresholds on each ingest.
Handles ISO threshold mapping, early-warning RUL alarms, role-based routing.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# ISO 4406 class thresholds (particle count per mL at 4μm)
ISO_4406_ALERT = 5000  # class breach to 18/16/13
ISO_4406_CRITICAL = 10000


@shared_task(name="apps.alerts.evaluate_thresholds")
def evaluate_thresholds(asset_id: str):
    from apps.assets.models import Asset, SensorDefinition
    from apps.alerts.models import AlarmEvent
    from apps.telemetry.models import SensorReading
    from apps.ml.models import MLPrediction
    from django.db.models import Avg
    from datetime import timedelta

    try:
        asset = Asset.objects.get(id=asset_id)
        now = timezone.now()
        window = now - timedelta(minutes=2)

        recent = SensorReading.objects.filter(
            asset=asset, time__gte=window
        ).values("sensor_def_id", "sensor_def__sensor_name", "sensor_def__alert_threshold",
                 "sensor_def__trip_threshold", "sensor_def__iso_standard_ref",
                 "sensor_def__unit").annotate(avg=Avg("value"))

        for r in recent:
            avg = r["avg"]
            if avg is None:
                continue

            # Trip threshold
            trip = r["sensor_def__trip_threshold"]
            if trip is not None and avg >= trip:
                _create_alarm(asset, r, avg, trip, "trip", "Trip threshold breached")
                continue

            # Alert threshold
            alert = r["sensor_def__alert_threshold"]
            if alert is not None and avg >= alert:
                _create_alarm(asset, r, avg, alert, "alert", "Alert threshold breached")
                continue

            # ISO-specific checks
            _check_iso_specific(asset, r, avg)

        # RUL early warning — check if RUL < 24h
        _check_rul_early_warning(asset)

    except Exception as exc:
        logger.error("alert_eval_error", asset_id=asset_id, error=str(exc))


def _create_alarm(asset, sensor_info, value, threshold, severity, message):
    from apps.alerts.models import AlarmEvent
    from apps.assets.models import SensorDefinition
    # Dedup: don't create duplicate unacknowledged alarms for same sensor+severity
    existing = AlarmEvent.objects.filter(
        asset=asset,
        sensor_def_id=sensor_info["sensor_def_id"],
        severity=severity,
        acknowledged=False,
    ).exists()
    if existing:
        return

    alarm = AlarmEvent.objects.create(
        asset=asset,
        sensor_def_id=sensor_info["sensor_def_id"],
        alarm_type=f"{sensor_info['sensor_def__sensor_name']}_{severity}",
        severity=severity,
        message=f"{message}: {sensor_info['sensor_def__sensor_name']} = {round(value, 4)} {sensor_info['sensor_def__unit']}",
        value_at_alarm=value,
        threshold_breached=threshold,
        iso_standard_ref=sensor_info.get("sensor_def__iso_standard_ref", ""),
    )
    _notify_users(asset, alarm)


def _check_iso_specific(asset, r, avg):
    name = r["sensor_def__sensor_name"]
    # ISO 4406 oil cleanliness
    if name == "oil_particle_count_4um":
        if avg >= ISO_4406_CRITICAL:
            _create_alarm(asset, r, avg, ISO_4406_CRITICAL, "trip", "ISO 4406 class critically breached")
        elif avg >= ISO_4406_ALERT:
            _create_alarm(asset, r, avg, ISO_4406_ALERT, "alert", "ISO 4406 class breached (>18/16/13)")

    # SRF zone temp deviation >±15°C
    if "zone" in name and "temp" in name:
        from apps.twins.models import AssetTwinState
        twin = AssetTwinState.objects.filter(asset=asset).first()
        if twin:
            zone_temps = twin.state.get("zone_temps", [])
            if zone_temps:
                mean_t = sum(t for t in zone_temps if t) / max(len([t for t in zone_temps if t]), 1)
                if abs(avg - mean_t) > 15:
                    _create_alarm(asset, r, avg, mean_t + 15, "warning", f"Zone temp deviation >±15°C (ISO zone uniformity)")

    # HHPD header pressure <380 bar
    if name == "header_pressure" and avg < 380:
        _create_alarm(asset, r, avg, 380, "alert", "HHPD header pressure below 380 bar")


def _check_rul_early_warning(asset):
    from apps.ml.models import MLPrediction
    from apps.alerts.models import AlarmEvent
    last_rul = MLPrediction.objects.filter(
        asset=asset, model__model_type="rul_predictor"
    ).order_by("-prediction_time").first()
    if last_rul:
        rul = last_rul.prediction_output.get("rul_hours")
        if rul is not None and rul < 24:
            existing = AlarmEvent.objects.filter(
                asset=asset, alarm_type="rul_early_warning", acknowledged=False
            ).exists()
            if not existing:
                AlarmEvent.objects.create(
                    asset=asset,
                    alarm_type="rul_early_warning",
                    severity="alert" if rul >= 8 else "trip",
                    message=f"RUL predicted at {round(rul, 1)} hours — maintenance required soon.",
                    iso_standard_ref="ISO 17359",
                )


def _notify_users(asset, alarm):
    """Route alarm to user WS channels by role."""
    from apps.users.models import User
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    channel_layer = get_channel_layer()
    payload = {
        "type": "alert.new",
        "asset_id": str(asset.id),
        "asset_name": asset.name,
        "alarm_type": alarm.alarm_type,
        "severity": alarm.severity,
        "message": alarm.message,
        "timestamp": alarm.created_at.isoformat(),
    }

    # Broadcast to all alerts group
    async_to_sync(channel_layer.group_send)("alerts_broadcast", payload)

    # Route to specific users with factory access
    for user in User.objects.filter(factory_access__contains=[str(asset.factory_id)]):
        async_to_sync(channel_layer.group_send)(f"alerts_user_{user.id}", payload)

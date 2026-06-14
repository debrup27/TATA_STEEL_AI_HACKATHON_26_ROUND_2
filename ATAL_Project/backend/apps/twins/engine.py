"""
TwinStateEngine — processes telemetry → updates AssetTwinState.
Evaluates operating envelope transitions and emits WS events.
"""
import logging
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

# Per-asset twin state field mappings
TWIN_FIELD_MAP = {
    "SRF": {
        "zone_1_temp": "zone_temps.0", "zone_2_temp": "zone_temps.1",
        "zone_3_temp": "zone_temps.2", "zone_4_temp": "zone_temps.3",
        "zone_5_temp": "zone_temps.4", "zone_6_temp": "zone_temps.5",
        "slab_temp_out": "slab_temp_out", "gas_flow": "gas_flow",
        "o2_pct": "o2_pct", "beam_stroke": "beam_stroke",
        "air_fuel_ratio": "air_fuel_ratio",
    },
    "HHPD": {
        "header_pressure": "header_pressure", "flow_rate": "flow_rate",
        "ae_intensity_20khz": "ae_intensity", "filter_delta_p": "filter_delta_p",
        "pump_vibration_rms": "pump_vibration",
    },
    "FS": {
        "rolling_force_f1": "rolling_force.0", "vibration_rms_f1": "vibration_rms.0",
        "bpfo_amplitude_f1": "bpfo_amplitude.0", "sideload_f1": "sideload.0",
        "spindle_torque_f1": "spindle_torque.0", "gap_position_f1": "gap_position.0",
        "housing_temp_f1": "housing_temp.0",
    },
    "HAGCC": {
        "gap_position": "gap_position", "oil_pressure": "oil_pressure",
        "bypass_flow": "bypass_flow", "hysteresis_deviation_um": "hysteresis_deviation",
        "oil_particle_count_4um": "oil_particle_count",
    },
    "APT": {
        "hcl_free_pct": "hcl_free_pct", "tank_temp": "temp",
        "fecl2_gpl": "fecl2_gpl", "rinse_flow": "rinse_flow",
        "tank_wall_thickness_mm": "tank_wall_thickness_mm",
    },
    "TCMS": {
        "rolling_force": "rolling_force", "interstand_tension": "interstand_tension",
        "emulsion_flow": "emulsion_flow", "emulsion_iron_ppm": "emulsion_iron_ppm",
        "emulsion_ph": "emulsion_ph", "bpfo_amplitude_142hz": "bpfo_amplitude_142hz",
        "chock_temp": "chock_temp",
    },
    "CGP": {
        "pot_temp": "pot_temp", "fe_in_zinc_pct": "fe_in_zinc_pct",
        "pot_level": "pot_level", "pot_roll_torque": "sink_roll_torque",
        "inductor_power": "inductor_power",
    },
    "HPAK": {
        "air_pressure": "air_pressure", "nozzle_distance_mm": "nozzle_distance",
        "blower_current": "blower_current",
        "header_pressure_drop_mbar": "header_pressure_drop",
        "coating_weight_deviation_gm2": "coating_weight_deviation",
    },
}


class TwinStateEngine:
    @staticmethod
    def update(asset_id: str):
        from apps.assets.models import Asset, SensorDefinition
        from apps.twins.models import AssetTwinState, TwinStateHistory
        from apps.telemetry.models import SensorReading
        from datetime import timedelta
        from django.utils import timezone as dj_tz
        from django.db.models import Avg

        try:
            asset = Asset.objects.get(id=asset_id)
            twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
            now = dj_tz.now()
            window = now - timedelta(minutes=5)

            # Aggregate last 5 min of readings per sensor
            readings = SensorReading.objects.filter(
                asset=asset, time__gte=window
            ).values("sensor_def__sensor_name").annotate(avg=Avg("value"))

            field_map = TWIN_FIELD_MAP.get(asset.asset_type, {})
            state = dict(twin.state)

            for r in readings:
                twin_key = field_map.get(r["sensor_def__sensor_name"])
                if twin_key and r["avg"] is not None:
                    # Handle nested keys like "zone_temps.0"
                    parts = twin_key.split(".")
                    if len(parts) == 2:
                        arr_key, idx = parts[0], int(parts[1])
                        arr = state.get(arr_key, [None] * (idx + 1))
                        if len(arr) <= idx:
                            arr.extend([None] * (idx + 1 - len(arr)))
                        arr[idx] = round(r["avg"], 4)
                        state[arr_key] = arr
                    else:
                        state[twin_key] = round(r["avg"], 4)

            # Compute health score from sensor deviations
            health = TwinStateEngine._compute_health(asset, readings)
            state["health_score"] = health

            twin.state = state
            twin.health_score = health
            twin.updated_at = now
            twin.save()

            # Write to history hypertable
            TwinStateHistory.objects.create(asset=asset, time=now, state=state, health_score=health)

            # Emit WS event
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"twins_{asset_id}",
                {
                    "type": "twin.state_changed",
                    "asset_id": str(asset_id),
                    "state": state,
                    "health_score": health,
                    "timestamp": now.isoformat(),
                },
            )
        except Exception as exc:
            logger.error("twin_update_error asset_id=%s error=%s", asset_id, str(exc))

    @staticmethod
    def _compute_health(asset, readings) -> float:
        from apps.assets.models import SensorDefinition
        score = 100.0
        sensor_defs = {s.sensor_name: s for s in SensorDefinition.objects.filter(asset=asset)}
        for r in readings:
            name = r["sensor_def__sensor_name"]
            avg = r["avg"]
            sdef = sensor_defs.get(name)
            if sdef is None or avg is None:
                continue
            if sdef.trip_threshold and avg >= sdef.trip_threshold:
                score -= 30
            elif sdef.alert_threshold and avg >= sdef.alert_threshold:
                score -= 15
            elif sdef.normal_max and avg > sdef.normal_max:
                score -= 5
            elif sdef.normal_min and avg < sdef.normal_min:
                score -= 5
        return max(0.0, min(100.0, score))

    @staticmethod
    def schedule_update(asset_id: str):
        from apps.twins.tasks import update_twin_state
        update_twin_state.apply_async(args=[asset_id])

"""
SensorFaultInjector — injects dropout, drift, spike, frozen-value faults.
CrossStageCorrelationGenerator — SRF underheating → FS force spike pairs.
PlantAggregationGenerator — plant-level urgency tier labeling.
"""
import numpy as np
from datetime import datetime
from apps.synthetic.generators.base import BaseGenerator, GeneratorOutput, SensorSample


class SensorFaultInjector(BaseGenerator):
    FAULT_TYPES = ["dropout", "drift", "spike", "frozen"]

    def inject(self, samples: list, fault_type: str, start_idx: int, duration: int) -> list:
        if fault_type not in self.FAULT_TYPES:
            return samples
        result = list(samples)
        for i in range(start_idx, min(start_idx + duration, len(result))):
            s = result[i]
            if fault_type == "dropout":
                result[i] = SensorSample(
                    timestamp=s.timestamp, sensor_name=s.sensor_name,
                    value=float("nan"), quality_flag=2,
                    source="injected", condition_type="sensor_fault",
                    label="sensor_fault:dropout",
                )
            elif fault_type == "drift":
                drift = (i - start_idx) * 0.1 * abs(s.value)
                result[i] = SensorSample(
                    timestamp=s.timestamp, sensor_name=s.sensor_name,
                    value=s.value + drift, quality_flag=1,
                    source="injected", condition_type="sensor_fault",
                    label="sensor_fault:drift",
                )
            elif fault_type == "spike":
                result[i] = SensorSample(
                    timestamp=s.timestamp, sensor_name=s.sensor_name,
                    value=s.value * self.rng.choice([5.0, -3.0]),
                    quality_flag=1, source="injected", condition_type="sensor_fault",
                    label="sensor_fault:spike",
                )
            elif fault_type == "frozen":
                frozen_val = samples[start_idx].value
                result[i] = SensorSample(
                    timestamp=s.timestamp, sensor_name=s.sensor_name,
                    value=frozen_val, quality_flag=1,
                    source="injected", condition_type="sensor_fault",
                    label="sensor_fault:frozen",
                )
        return result


class CrossStageCorrelationGenerator:
    """Pairs SRF underheating events with downstream FS rolling force spikes."""
    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)

    def generate_pair(self, base_time: datetime, lag_min: float = 8.0) -> dict:
        from datetime import timedelta
        underheating_time = base_time
        fs_spike_time = base_time + timedelta(minutes=lag_min)
        return {
            "event_type": "srf_underheating_fs_force_cascade",
            "upstream": {
                "asset_type": "SRF",
                "sensor": "slab_temp_out",
                "value": float(self.rng.uniform(1100, 1145)),
                "timestamp": underheating_time.isoformat(),
                "label": "underheating",
            },
            "downstream": {
                "asset_type": "FS",
                "sensor": "rolling_force_f1",
                "value": float(self.rng.uniform(22, 26)),
                "timestamp": fs_spike_time.isoformat(),
                "label": "force_spike_from_underheating",
            },
            "causal_chain_type": "thermal_deficit_to_roll_force",
            "lag_minutes": lag_min,
        }


class PlantAggregationGenerator:
    URGENCY_TIERS = {
        1: "immediate_action",
        2: "schedule_within_24h",
        3: "schedule_within_week",
        4: "monitor",
    }

    def generate_plant_snapshot(self, asset_health_scores: dict, spares_stock: dict, lead_times: dict) -> dict:
        avg_health = sum(asset_health_scores.values()) / max(len(asset_health_scores), 1)
        min_health = min(asset_health_scores.values(), default=100)
        any_critical_spares_missing = any(
            stock == 0 and lead_times.get(part, 0) > 7
            for part, stock in spares_stock.items()
        )

        if min_health < 30 or any_critical_spares_missing:
            tier = 1
        elif min_health < 50:
            tier = 2
        elif min_health < 70:
            tier = 3
        else:
            tier = 4

        return {
            "plant_health_score": round(avg_health, 2),
            "worst_asset_health": min_health,
            "urgency_tier": tier,
            "urgency_label": self.URGENCY_TIERS[tier],
            "spares_critical_shortage": any_critical_spares_missing,
            "asset_scores": asset_health_scores,
        }

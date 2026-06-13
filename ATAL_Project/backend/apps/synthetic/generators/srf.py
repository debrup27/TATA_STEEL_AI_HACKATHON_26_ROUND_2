"""
SRF Synthetic Generator
Physics: T_slab(t) = T_target − ΔT·(1−e^{−t/τ_thermal})
τ_thermal = 45 min, ΔT ≈ 60°C for underheating event
Refractory degradation: zone deviation growth over campaign time
"""
import numpy as np
from datetime import datetime
from apps.synthetic.generators.base import BaseGenerator, GeneratorOutput, SensorSample


class SRFSyntheticGenerator(BaseGenerator):
    ASSET_TYPE = "SRF"

    # Normal operating envelopes
    ZONE_TEMP_NOMINAL = 1200.0   # °C
    ZONE_TEMP_STD = 8.0
    ZONE_COUNT = 6
    O2_NOMINAL = 2.0             # %
    O2_STD = 0.15
    AFR_NOMINAL = 1.10
    AFR_STD = 0.02
    GAS_FLOW_NOMINAL = 10000.0   # Nm³/hr
    BEAM_STROKE_NOMINAL = 150.0  # mm

    # Underheating event params
    DELTA_T = 60.0               # °C
    TAU_THERMAL = 45.0 * 60      # 45 min in seconds

    def generate(
        self,
        n_samples: int,
        start_time: datetime = None,
        inject_underheating: bool = False,
        inject_refractory_degradation: bool = False,
        inject_seal_drift: bool = False,
        campaign_time_hr: float = 0.0,
    ) -> GeneratorOutput:
        timestamps = self._timestamps(n_samples, start_time, freq_sec=10.0)
        output = GeneratorOutput(asset_type=self.ASSET_TYPE)
        fault_events = []
        refractory_pct = max(0.0, 100.0 - campaign_time_hr * 0.01)

        for i, ts in enumerate(timestamps):
            t_sec = i * 10.0

            # Zone temperatures — refractory degradation widens zone deviation
            refractory_noise = (1.0 + (100 - refractory_pct) * 0.005) if inject_refractory_degradation else 1.0
            for z in range(1, self.ZONE_COUNT + 1):
                zone_temp = self._noise(
                    self.ZONE_TEMP_NOMINAL, std_frac=self.ZONE_TEMP_STD / self.ZONE_TEMP_NOMINAL
                )
                # Underheating: apply thermal lag to zone temps
                if inject_underheating:
                    lag_factor = 1.0 - np.exp(-t_sec / self.TAU_THERMAL)
                    deficit = self.DELTA_T * (1.0 - lag_factor)
                    zone_temp -= deficit
                    if i == 0:
                        fault_events.append({
                            "type": "underheating_onset",
                            "timestamp": ts.isoformat(),
                            "tau_sec": self.TAU_THERMAL,
                            "delta_t": self.DELTA_T,
                        })

                zone_temp *= refractory_noise
                output.samples.append(SensorSample(
                    timestamp=ts,
                    sensor_name=f"zone_{z}_temp",
                    value=round(zone_temp, 2),
                    label="underheating" if inject_underheating and zone_temp < 1150 else "normal",
                ))

            # Slab exit temp (average of zones − additional lag)
            base_slab = self.ZONE_TEMP_NOMINAL - 20.0
            if inject_underheating:
                lag_factor = 1.0 - np.exp(-t_sec / self.TAU_THERMAL)
                base_slab -= self.DELTA_T * (1.0 - lag_factor)
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="slab_temp_out",
                value=round(self._noise(base_slab, std_frac=0.01), 2),
            ))

            # Gas flow
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="gas_flow",
                value=round(self._noise(self.GAS_FLOW_NOMINAL, std_frac=0.03), 1),
            ))

            # O2 — combustion drift
            o2_val = self.O2_NOMINAL
            if inject_underheating:
                o2_val -= self.rng.uniform(0.1, 0.4)
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="o2_pct",
                value=round(self._noise(o2_val, std_frac=0.05), 3),
                label="drift" if o2_val < 1.5 else "normal",
            ))

            # Air-fuel ratio
            afr = self.AFR_NOMINAL
            if inject_underheating:
                afr -= self.rng.uniform(0.02, 0.05)
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="air_fuel_ratio",
                value=round(self._noise(afr, std_frac=0.01), 4),
                label="drift" if afr < 1.05 else "normal",
            ))

            # Beam stroke — seal drift
            stroke_drift = 0.0
            if inject_seal_drift:
                drift_rate = 0.001 * np.exp(t_sec / (4000 * 3600))
                stroke_drift = drift_rate * t_sec
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="beam_stroke",
                value=round(self._noise(self.BEAM_STROKE_NOMINAL + stroke_drift, std_frac=0.005), 2),
                label="drift" if stroke_drift > 5.0 else "normal",
            ))

        output.fault_events = fault_events
        output.labels = {
            "campaign_refractory_pct": refractory_pct,
            "underheating_injected": inject_underheating,
            "seal_drift_injected": inject_seal_drift,
        }
        return output

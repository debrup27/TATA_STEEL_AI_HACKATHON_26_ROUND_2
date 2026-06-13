"""
HAGCC Synthetic Generator
Seal drift: drift_rate(t) = 0.001·e^{t/4000hr}
Hysteresis deviation alarm: > 50 μm
ISO 4406 oil cleanliness target: 15/13/10
"""
import numpy as np
from datetime import datetime
from apps.synthetic.generators.base import BaseGenerator, GeneratorOutput, SensorSample


class HAGCCSyntheticGenerator(BaseGenerator):
    ASSET_TYPE = "HAGCC"
    SEAL_DRIFT_BASE = 0.001    # mm/min at t=0
    SEAL_TAU_HR = 4000.0

    def generate(
        self,
        n_samples: int,
        start_time: datetime = None,
        seal_age_hr: float = 0.0,
        inject_oil_contamination: bool = False,
        inject_hysteresis: bool = False,
    ) -> GeneratorOutput:
        timestamps = self._timestamps(n_samples, start_time, freq_sec=0.01)  # 100 Hz
        output = GeneratorOutput(asset_type=self.ASSET_TYPE)

        for i, ts in enumerate(timestamps):
            t_hr = seal_age_hr + i * (0.01 / 3600)
            drift_rate = self.SEAL_DRIFT_BASE * np.exp(t_hr / self.SEAL_TAU_HR)

            # Hysteresis deviation
            hysteresis_um = 10.0 + drift_rate * 1000 * 3600 * t_hr * 0.001
            if inject_hysteresis:
                hysteresis_um *= self.rng.uniform(1.5, 3.0)
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="hysteresis_deviation_um",
                value=round(self._noise(hysteresis_um, std_frac=0.05), 2),
                label="alarm" if hysteresis_um > 50 else "normal",
            ))

            # Gap position LVDT
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="gap_position",
                value=round(self._noise(20.0, std_frac=0.002), 4),
            ))

            # Oil pressure
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="oil_pressure",
                value=round(self._noise(300.0, std_frac=0.02), 2),
            ))

            # Bypass flow — increases with seal degradation
            bypass = 0.1 + drift_rate * 500
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="bypass_flow",
                value=round(self._noise(bypass, std_frac=0.1), 4),
                label="leak" if bypass > 2.0 else "normal",
            ))

            # ISO 4406 particle count (particles/mL > 4μm)
            base_count = 200.0
            if inject_oil_contamination:
                base_count = self.rng.uniform(5000, 12000)
                output.fault_events.append({
                    "type": "oil_contamination",
                    "timestamp": ts.isoformat(),
                    "iso_class_breach": True,
                })
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="oil_particle_count_4um",
                value=round(self._noise(base_count, std_frac=0.15), 0),
                label="contaminated" if base_count > 5000 else "clean",
            ))

        # RUL: hours until drift_rate reaches 0.01 mm/min
        rul_hr = self.SEAL_TAU_HR * np.log(0.01 / self.SEAL_DRIFT_BASE) - seal_age_hr
        output.labels = {
            "seal_age_hr": seal_age_hr,
            "current_drift_rate": self.SEAL_DRIFT_BASE * np.exp(seal_age_hr / self.SEAL_TAU_HR),
            "rul_hours": max(0, rul_hr),
        }
        return output

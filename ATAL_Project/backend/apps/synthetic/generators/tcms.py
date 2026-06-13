"""
TCMS Synthetic Generator
4-stage bearing wear:
  Stage 1: baseline (temp ~45°C, BPFO quiet)
  Stage 2: temp 45→65°C, faint BPFO at 142 Hz
  Stage 3: temp >65°C, BPFO -28→-20 dB
  Stage 4 (alarm): temp >80°C, BPFO >-12 dB
"""
import numpy as np
from datetime import datetime
from apps.synthetic.generators.base import BaseGenerator, GeneratorOutput, SensorSample


STAGE_PARAMS = {
    1: {"temp_range": (40, 50), "bpfo_range": (-55, -45), "rul_factor": 1.0},
    2: {"temp_range": (55, 68), "bpfo_range": (-35, -22), "rul_factor": 0.6},
    3: {"temp_range": (65, 82), "bpfo_range": (-22, -13), "rul_factor": 0.25},
    4: {"temp_range": (80, 95), "bpfo_range": (-13, -6), "rul_factor": 0.0},
}


class TCMSSyntheticGenerator(BaseGenerator):
    ASSET_TYPE = "TCMS"
    BASE_RUL_HR = 2000.0  # RUL at start of Stage 1

    def generate(
        self,
        n_samples: int,
        start_time: datetime = None,
        bearing_stage: int = 1,
        inject_emulsion_contamination: bool = False,
    ) -> GeneratorOutput:
        timestamps = self._timestamps(n_samples, start_time, freq_sec=1.0)
        output = GeneratorOutput(asset_type=self.ASSET_TYPE)

        p = STAGE_PARAMS.get(bearing_stage, STAGE_PARAMS[1])
        rul_hr = self.BASE_RUL_HR * p["rul_factor"]

        for i, ts in enumerate(timestamps):
            # Bearing temperature
            temp = self.rng.uniform(*p["temp_range"])
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="chock_temp",
                value=round(self._noise(temp, std_frac=0.02), 2),
                label=f"stage_{bearing_stage}:rul_{int(max(0, rul_hr - i/3600))}h",
            ))

            # BPFO amplitude at 142 Hz
            bpfo = self.rng.uniform(*p["bpfo_range"])
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="bpfo_amplitude_142hz",
                value=round(self._noise(bpfo, std_frac=0.04), 2),
                label=f"stage_{bearing_stage}",
            ))

            # Rolling force
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="rolling_force",
                value=round(self._noise(14.0, std_frac=0.05), 3),
            ))

            # Interstand tension
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="interstand_tension",
                value=round(self._noise(100.0, std_frac=0.04), 2),
            ))

            # Emulsion flow
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="emulsion_flow",
                value=round(self._noise(3000.0, std_frac=0.03), 1),
            ))

            # Emulsion contamination
            iron_ppm = 100.0
            ph = 6.0
            if inject_emulsion_contamination:
                iron_ppm = self.rng.uniform(250, 500)
                ph = self.rng.uniform(4.5, 5.3)
                output.fault_events.append({
                    "type": "emulsion_contamination",
                    "timestamp": ts.isoformat(),
                    "iron_ppm": iron_ppm,
                    "ph": ph,
                })
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="emulsion_iron_ppm",
                value=round(self._noise(iron_ppm, std_frac=0.1), 1),
                label="contaminated" if iron_ppm > 200 else "normal",
            ))
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="emulsion_ph",
                value=round(self._noise(ph, std_frac=0.02), 3),
                label="alarm" if not (5.5 <= ph <= 6.5) else "normal",
            ))

        output.labels = {
            "bearing_stage": bearing_stage,
            "rul_hours": max(0, rul_hr),
            "is_alarm_stage": bearing_stage == 4,
        }
        return output

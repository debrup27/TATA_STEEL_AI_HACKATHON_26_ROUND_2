"""
HPAK Synthetic Generator
Crystallization blockage: block_factor(x,t) = 1 − e^{−dep_rate·t}
Coating weight: CW(x,t) = CW_target·(1 + block_factor(x,t))
Pressure drop alarm: > 95 mbar (ISO 17359)
"""
import numpy as np
from datetime import datetime
from apps.synthetic.generators.base import BaseGenerator, GeneratorOutput, SensorSample


class HPAKSyntheticGenerator(BaseGenerator):
    ASSET_TYPE = "HPAK"
    DEP_RATE = 0.0001   # per minute
    CW_TARGET = 275.0   # g/m² typical

    def generate(
        self,
        n_samples: int,
        start_time: datetime = None,
        blockage_time_min: float = 0.0,
        inject_crystallization: bool = False,
    ) -> GeneratorOutput:
        timestamps = self._timestamps(n_samples, start_time, freq_sec=1.0)
        output = GeneratorOutput(asset_type=self.ASSET_TYPE)

        for i, ts in enumerate(timestamps):
            t_min = blockage_time_min + i / 60.0

            block_factor = 1.0 - np.exp(-self.DEP_RATE * t_min) if inject_crystallization else 0.0

            # Pressure drop grows with blockage
            pressure_drop_mbar = 20.0 + block_factor * 200.0
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="header_pressure_drop_mbar",
                value=round(self._noise(pressure_drop_mbar, std_frac=0.05), 2),
                label="alarm" if pressure_drop_mbar > 95 else "normal",
            ))

            # Blower current rises as back-pressure increases
            blower_current = 40.0 + block_factor * 40.0
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="blower_current",
                value=round(self._noise(blower_current, std_frac=0.03), 2),
            ))

            # Air pressure at nozzle drops
            air_p = 0.8 - block_factor * 0.5
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="air_pressure",
                value=round(self._noise(max(0.05, air_p), std_frac=0.04), 3),
            ))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="nozzle_distance_mm",
                value=round(self._noise(12.0, std_frac=0.02), 2),
            ))

            # Coating weight deviation
            cw_dev = block_factor * 15.0  # stripes appear as block_factor grows
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="coating_weight_deviation_gm2",
                value=round(self._noise(cw_dev, std_frac=0.1), 2),
                label="stripe" if cw_dev > 5.0 else "normal",
            ))

            if inject_crystallization and pressure_drop_mbar > 95 and i == 0:
                output.fault_events.append({
                    "type": "nozzle_crystallization_alarm",
                    "timestamp": ts.isoformat(),
                    "pressure_drop_mbar": pressure_drop_mbar,
                    "standard": "ISO 17359",
                })

        output.labels = {
            "block_factor": block_factor,
            "blockage_time_min": t_min,
            "crystallization_injected": inject_crystallization,
        }
        return output

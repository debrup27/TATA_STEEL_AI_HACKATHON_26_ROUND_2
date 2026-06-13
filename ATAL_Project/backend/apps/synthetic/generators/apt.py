"""
APT Synthetic Generator
HCl depletion: [HCl](t) = [HCl₀] − k·[FeO_scale]·speed·width·thickness·t
k ≈ 0.002 (m/g·hr normalised)
Safety alarm: FeCl₂ > 120 g/L, temp outside [65-85°C]
"""
import numpy as np
from datetime import datetime
from apps.synthetic.generators.base import BaseGenerator, GeneratorOutput, SensorSample


class APTSyntheticGenerator(BaseGenerator):
    ASSET_TYPE = "APT"
    HCL0 = 15.0          # % (midpoint of 12-18%)
    K_CONSUMPTION = 0.002
    FEO_SCALE = 5.0      # g/m² typical
    LINE_SPEED = 80.0    # m/min
    STRIP_WIDTH = 1.2    # m
    STRIP_THICKNESS = 0.003  # m

    def generate(
        self,
        n_samples: int,
        start_time: datetime = None,
        pickling_time_hr: float = 0.0,
        inject_lining_failure: bool = False,
        inject_safety_breach: bool = False,
    ) -> GeneratorOutput:
        timestamps = self._timestamps(n_samples, start_time, freq_sec=60.0)
        output = GeneratorOutput(asset_type=self.ASSET_TYPE)

        hcl = self.HCL0
        fecl2 = 30.0  # g/L initial

        for i, ts in enumerate(timestamps):
            t_hr = pickling_time_hr + i / 60.0

            # HCl depletion formula
            rate = self.K_CONSUMPTION * self.FEO_SCALE * self.LINE_SPEED * self.STRIP_WIDTH * self.STRIP_THICKNESS
            hcl = max(0, self.HCL0 - rate * t_hr)
            fecl2 = min(200, 30 + rate * t_hr * 40)

            # Hours to replenishment (when HCl drops to 12%)
            if rate > 0:
                rul_hr = max(0, (hcl - 12.0) / rate)
            else:
                rul_hr = 9999

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="hcl_free_pct",
                value=round(self._noise(hcl, std_frac=0.03), 3),
                label=f"rul_hr:{int(rul_hr)}",
            ))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="fecl2_gpl",
                value=round(self._noise(fecl2, std_frac=0.05), 2),
                label="alarm" if fecl2 > 120 else "normal",
            ))

            # Temperature
            temp = 75.0
            if inject_safety_breach:
                temp = self.rng.choice([self.rng.uniform(60, 64), self.rng.uniform(87, 96)])
                output.fault_events.append({
                    "type": "temperature_safety_breach",
                    "timestamp": ts.isoformat(),
                    "temp": temp,
                    "standard": "OSHA 1910.119",
                })
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="tank_temp",
                value=round(self._noise(temp, std_frac=0.01), 2),
                label="alarm" if not (65 <= temp <= 85) else "normal",
            ))

            # Rinse flow
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="rinse_flow",
                value=round(self._noise(15.0, std_frac=0.05), 2),
            ))

            # Tank wall thickness (UT probe — very slow change)
            wall_thickness = 15.0 - (t_hr * 1.5 / 8760)  # 1.5 mm/yr corrosion
            if inject_lining_failure:
                wall_thickness -= self.rng.uniform(0.5, 2.0)
                output.fault_events.append({
                    "type": "lining_pinhole",
                    "timestamp": ts.isoformat(),
                    "thickness_mm": wall_thickness,
                })
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="tank_wall_thickness_mm",
                value=round(self._noise(max(5, wall_thickness), std_frac=0.01), 3),
                label="alarm" if wall_thickness < 7 else "normal",
            ))

        output.labels = {
            "hcl_current_pct": hcl,
            "fecl2_current_gpl": fecl2,
            "rul_hours_to_replenishment": rul_hr,
        }
        return output

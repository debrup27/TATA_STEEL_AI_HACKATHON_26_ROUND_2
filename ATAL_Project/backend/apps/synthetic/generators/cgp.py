"""
CGP Synthetic Generator
Dross: dross_rate(T) = A·exp(−Q/RT)  Q=80,000 J/mol, R=8.314
Critical alarm: pot_temp > 462°C (4.4× acceleration), >470°C = critical
Fe-in-zinc alarm: > 0.03% (solubility limit)
Bushing wear: diameter loss from torque/RPM signature
"""
import numpy as np
from datetime import datetime
from apps.synthetic.generators.base import BaseGenerator, GeneratorOutput, SensorSample

R = 8.314  # J/(mol·K)
Q = 80_000  # J/mol
A = 1e6     # pre-exponential factor (normalized)


def dross_rate(temp_c: float) -> float:
    T_K = temp_c + 273.15
    return A * np.exp(-Q / (R * T_K))


class CGPSyntheticGenerator(BaseGenerator):
    ASSET_TYPE = "CGP"

    def generate(
        self,
        n_samples: int,
        start_time: datetime = None,
        pot_temp: float = 455.0,
        inject_temp_excursion: bool = False,
        inject_bushing_wear: bool = False,
        bushing_wear_mm: float = 0.0,
    ) -> GeneratorOutput:
        timestamps = self._timestamps(n_samples, start_time, freq_sec=2.0)
        output = GeneratorOutput(asset_type=self.ASSET_TYPE)

        fe_in_zinc = 0.01  # % initial

        for i, ts in enumerate(timestamps):
            T = pot_temp
            if inject_temp_excursion and i > n_samples // 3:
                T = self.rng.uniform(463, 475)
                if i == n_samples // 3 + 1:
                    output.fault_events.append({
                        "type": "temperature_excursion",
                        "timestamp": ts.isoformat(),
                        "temp_c": T,
                        "dross_acceleration": dross_rate(T) / dross_rate(455),
                    })

            dr = dross_rate(T)
            fe_in_zinc = min(0.08, fe_in_zinc + dr * 1e-9)

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="pot_temp",
                value=round(self._noise(T, std_frac=0.002), 2),
                label="critical" if T > 470 else ("alarm" if T > 462 else "normal"),
            ))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="fe_in_zinc_pct",
                value=round(self._noise(fe_in_zinc, std_frac=0.05), 5),
                label="alarm" if fe_in_zinc > 0.03 else "normal",
            ))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="pot_level",
                value=round(self._noise(650.0, std_frac=0.02), 1),
            ))

            # Bushing wear → torque signature
            torque_nominal = 200.0
            if inject_bushing_wear:
                torque_nominal += bushing_wear_mm * 20  # torque rises with wear
                if bushing_wear_mm > 5.0:
                    output.fault_events.append({
                        "type": "bushing_wear_alarm",
                        "timestamp": ts.isoformat(),
                        "wear_mm": bushing_wear_mm,
                    })
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="pot_roll_torque",
                value=round(self._noise(torque_nominal, std_frac=0.05), 1),
                label="worn" if bushing_wear_mm > 5 else "normal",
            ))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="inductor_power",
                value=round(self._noise(400.0, std_frac=0.03), 1),
            ))

        output.labels = {
            "pot_temp_nominal": pot_temp,
            "dross_rate": dross_rate(pot_temp),
            "fe_in_zinc_pct": fe_in_zinc,
            "bushing_wear_mm": bushing_wear_mm,
            "temp_excursion_injected": inject_temp_excursion,
        }
        return output

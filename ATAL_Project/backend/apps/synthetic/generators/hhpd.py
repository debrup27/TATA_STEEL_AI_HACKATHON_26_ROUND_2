"""
HHPD Synthetic Generator
Nozzle erosion: d(n) = d₀(1 + 0.0002n)
Pressure decay: P(n) = P_supply · (d₀/d(n))^4
Cavitation: AE intensity spikes at 20-50 kHz
"""
import numpy as np
from datetime import datetime
from apps.synthetic.generators.base import BaseGenerator, GeneratorOutput, SensorSample


class HHPDSyntheticGenerator(BaseGenerator):
    ASSET_TYPE = "HHPD"

    P_SUPPLY = 400.0      # bar
    D0 = 1.0              # mm (normalized orifice diameter)
    EROSION_COEF = 0.0002
    FLOW_NOMINAL = 5000.0 # L/min
    AE_BASELINE = -45.0   # dB

    def generate(
        self,
        n_samples: int,
        start_time: datetime = None,
        nozzle_cycles: int = 0,
        inject_cavitation: bool = False,
    ) -> GeneratorOutput:
        timestamps = self._timestamps(n_samples, start_time, freq_sec=5.0)
        output = GeneratorOutput(asset_type=self.ASSET_TYPE)

        d_n = self.D0 * (1 + self.EROSION_COEF * nozzle_cycles)
        pressure = self.P_SUPPLY * (self.D0 / d_n) ** 4
        rul_cycles = max(0, int((1.5 * self.D0 - self.D0) / (self.EROSION_COEF * self.D0)))

        for i, ts in enumerate(timestamps):
            # Simulate incremental erosion per sample
            cycle = nozzle_cycles + i
            d_current = self.D0 * (1 + self.EROSION_COEF * cycle)
            p_current = self.P_SUPPLY * (self.D0 / d_current) ** 4

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="header_pressure",
                value=round(self._noise(p_current, std_frac=0.01), 2),
                label=f"rul_cycles:{rul_cycles - i}",
            ))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="flow_rate",
                value=round(self._noise(self.FLOW_NOMINAL * (d_current / self.D0) ** 2, std_frac=0.02), 1),
            ))

            # AE intensity — normal + optional cavitation spikes
            ae = self.AE_BASELINE
            is_cavitation = False
            if inject_cavitation and self.rng.random() < 0.05:
                ae += self.rng.uniform(20, 35)
                is_cavitation = True
                output.fault_events.append({
                    "type": "cavitation_event",
                    "timestamp": ts.isoformat(),
                    "ae_spike_db": ae,
                })
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="ae_intensity_20khz",
                value=round(self._noise(ae, std_frac=0.05), 2),
                label="cavitation" if is_cavitation else "normal",
            ))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="filter_delta_p",
                value=round(self._noise(0.5 + nozzle_cycles * 0.00002, std_frac=0.1), 3),
            ))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="pump_vibration_rms",
                value=round(self._noise(2.0 + (0.005 * nozzle_cycles / 1000), std_frac=0.08), 3),
            ))

        output.labels = {
            "nozzle_erosion_index": d_n / self.D0,
            "rul_cycles": rul_cycles,
            "cavitation_injected": inject_cavitation,
        }
        return output

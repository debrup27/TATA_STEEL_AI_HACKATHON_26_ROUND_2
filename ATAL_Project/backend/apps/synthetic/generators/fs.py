"""
FS Synthetic Generator
Bearing spallation: Paris-law crack da/dN = C(ΔK)^m  C=2e-12, m=3.2
BPFO amplitude growth tracks crack size
Chatter: 100-200 Hz self-excited oscillation
Chock wear: Clearance(n) = C0 + K_wear·n
"""
import numpy as np
from datetime import datetime
from apps.synthetic.generators.base import BaseGenerator, GeneratorOutput, SensorSample


class FSSyntheticGenerator(BaseGenerator):
    ASSET_TYPE = "FS"

    PARIS_C = 2e-12
    PARIS_M = 3.2
    BPFO_BASE = -45.0    # dB (healthy)
    C0_CLEARANCE = 0.05  # mm initial chock clearance
    K_WEAR = 5e-8        # mm per roll rev

    HEALTH_STAGES = {
        (float("-inf"), -28): 1,
        (-28, -20): 2,
        (-20, -12): 3,
        (-12, float("inf")): 4,
    }

    def _bpfo_stage(self, amplitude: float) -> int:
        for (lo, hi), stage in self.HEALTH_STAGES.items():
            if lo <= amplitude < hi:
                return stage
        return 4

    def generate(
        self,
        n_samples: int,
        start_time: datetime = None,
        crack_size_mm: float = 0.001,
        roll_revs: int = 0,
        inject_chatter: bool = False,
        inject_chock_wear: bool = False,
    ) -> GeneratorOutput:
        timestamps = self._timestamps(n_samples, start_time, freq_sec=0.1)
        output = GeneratorOutput(asset_type=self.ASSET_TYPE)

        # Paris-law crack propagation across samples
        # ΔK proportional to rolling force × sqrt(crack_size)
        DELTA_K_BASE = 12.0  # MPa√m typical for steel roll
        a = crack_size_mm / 1000.0  # convert to meters

        for i, ts in enumerate(timestamps):
            # Crack growth this step
            delta_k = DELTA_K_BASE * np.sqrt(a * 1000)  # scale for numerical stability
            da_dn = self.PARIS_C * (delta_k ** self.PARIS_M)
            a = max(a, a + da_dn * 0.1)  # 0.1 sec step

            # BPFO amplitude (dB) — grows as crack propagates
            bpfo_db = self.BPFO_BASE + 25 * np.log10(max(1, a * 1e5))
            bpfo_db = min(bpfo_db, -8.0)  # physical limit
            stage = self._bpfo_stage(bpfo_db)

            # RUL in hours (simple remaining crack-life estimate)
            # failure at a_crit = 5 mm
            a_crit = 0.005
            rul_hours = max(0, (a_crit - a) / max(da_dn * 3600, 1e-15))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="bpfo_amplitude_f1",
                value=round(self._noise(bpfo_db, std_frac=0.03), 2),
                label=f"stage_{stage}:rul_{int(rul_hours)}h",
            ))

            # Rolling force
            rf = 15.0
            if inject_chatter:
                chatter_freq = self.rng.uniform(100, 200)
                rf += 0.5 * np.sin(2 * np.pi * chatter_freq * ts.timestamp())
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="rolling_force_f1",
                value=round(self._noise(rf, std_frac=0.04), 3),
                label="chatter" if inject_chatter else "normal",
            ))

            # Vibration RMS
            vib = 2.5 + stage * 0.5
            if inject_chatter:
                vib += 2.0 * abs(np.sin(2 * np.pi * 150 * ts.timestamp()))
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="vibration_rms_f1",
                value=round(abs(self._noise(vib, std_frac=0.05)), 3),
                label="chatter" if vib > 4.5 else "normal",
            ))

            # Sideload
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="sideload_f1",
                value=round(self._noise(350.0, std_frac=0.06), 1),
            ))

            # Spindle torque
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="spindle_torque_f1",
                value=round(self._noise(1500.0, std_frac=0.04), 1),
            ))

            # Chock clearance
            n_revs = roll_revs + i * 10
            clearance = self.C0_CLEARANCE + self.K_WEAR * n_revs if inject_chock_wear else self.C0_CLEARANCE
            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="gap_position_f1",
                value=round(self._noise(clearance, std_frac=0.02), 4),
                label="worn" if clearance > 0.2 else "normal",
            ))

            output.samples.append(SensorSample(
                timestamp=ts, sensor_name="housing_temp_f1",
                value=round(self._noise(40.0 + stage * 5, std_frac=0.03), 2),
            ))

        output.labels = {
            "final_crack_size_mm": a * 1000,
            "final_bpfo_stage": stage,
            "rul_hours": rul_hours,
        }
        return output

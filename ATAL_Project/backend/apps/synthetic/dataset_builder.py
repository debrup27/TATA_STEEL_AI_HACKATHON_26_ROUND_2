"""
Build tabular ML training datasets from synthetic generators.

Strategy: run each generator multiple times with varied parameters.
Each run → aggregate sensor stats (mean, std, min, max) over N_WINDOW samples.
Returns (X, y_rul, y_fault, feature_names) numpy arrays.

Rich mode (for 7-day retrain): more scenarios, wider parameter space.
"""
import importlib
import logging
import numpy as np
from datetime import datetime, timezone
from typing import Tuple, List, Dict

logger = logging.getLogger(__name__)

N_WINDOW = 80   # samples per scenario run
N_STATS = 4     # mean, std, min, max per sensor

GENERATOR_MAP = {
    "SRF":   "apps.synthetic.generators.srf.SRFSyntheticGenerator",
    "HHPD":  "apps.synthetic.generators.hhpd.HHPDSyntheticGenerator",
    "FS":    "apps.synthetic.generators.fs.FSSyntheticGenerator",
    "HAGCC": "apps.synthetic.generators.hagcc.HAGCCSyntheticGenerator",
    "APT":   "apps.synthetic.generators.apt.APTSyntheticGenerator",
    "TCMS":  "apps.synthetic.generators.tcms.TCMSSyntheticGenerator",
    "CGP":   "apps.synthetic.generators.cgp.CGPSyntheticGenerator",
    "HPAK":  "apps.synthetic.generators.hpak.HPAKSyntheticGenerator",
}

# ---------------------------------------------------------------------------
# Per-asset scenario samplers
# Each returns (gen_kwargs, rul_hours, is_fault_label)
# ---------------------------------------------------------------------------

def _rng():
    return np.random.default_rng()


def _sample_scenarios_SRF(n: int, rich: bool) -> List[Tuple[dict, float, int]]:
    rng = _rng()
    scenarios = []
    for _ in range(n):
        campaign = rng.uniform(0, 8000 if rich else 5000)
        refractory_pct = max(0, 100 - campaign * 0.01)
        is_under = rng.random() < 0.25
        is_refrac = rng.random() < 0.2
        is_seal = rng.random() < 0.2
        is_fault = int(is_under or is_refrac or (is_seal and campaign > 2000))
        # RUL: remaining refractory life + underheating severity penalty
        rul = refractory_pct * 30 - (600 if is_under else 0)
        rul = max(50, rul)
        scenarios.append((
            {"inject_underheating": is_under,
             "inject_refractory_degradation": is_refrac,
             "inject_seal_drift": is_seal,
             "campaign_time_hr": float(campaign)},
            rul, is_fault,
        ))
    return scenarios


def _sample_scenarios_HHPD(n: int, rich: bool) -> List[Tuple[dict, float, int]]:
    rng = _rng()
    scenarios = []
    for _ in range(n):
        cycles = int(rng.uniform(0, 5000 if rich else 3000))
        inject_cav = rng.random() < 0.3
        # RUL: nozzle lasts ~5000 cycles before D reaches 1.5×D0
        rul = max(0, (5000 - cycles) * 0.4)
        is_fault = int(inject_cav or cycles > 4000)
        scenarios.append((
            {"nozzle_cycles": cycles, "inject_cavitation": inject_cav},
            rul, is_fault,
        ))
    return scenarios


def _sample_scenarios_FS(n: int, rich: bool) -> List[Tuple[dict, float, int]]:
    rng = _rng()
    scenarios = []
    for _ in range(n):
        crack = rng.uniform(0.001, 0.004 if rich else 0.003)
        revs = int(rng.uniform(0, 1_000_000 if rich else 500_000))
        inject_chatter = rng.random() < 0.25
        inject_chock = rng.random() < 0.2
        # RUL from Paris law: failure at a_crit=5mm
        from apps.synthetic.generators.fs import FSSyntheticGenerator
        a = crack / 1000
        DELTA_K = 12.0 * np.sqrt(a * 1000)
        da_dn = FSSyntheticGenerator.PARIS_C * (DELTA_K ** FSSyntheticGenerator.PARIS_M)
        a_crit = 0.005
        rul = max(0, (a_crit - a) / max(da_dn * 3600, 1e-15))
        is_fault = int(inject_chatter or inject_chock or crack > 0.003)
        scenarios.append((
            {"crack_size_mm": crack, "roll_revs": revs,
             "inject_chatter": inject_chatter, "inject_chock_wear": inject_chock},
            rul, is_fault,
        ))
    return scenarios


def _sample_scenarios_HAGCC(n: int, rich: bool) -> List[Tuple[dict, float, int]]:
    rng = _rng()
    scenarios = []
    for _ in range(n):
        seal_age = rng.uniform(0, 6000 if rich else 4000)
        inject_oil = rng.random() < 0.2
        inject_hyst = rng.random() < 0.25
        # HAGCC RUL formula: tau * ln(0.01/base_rate) - seal_age
        SEAL_DRIFT_BASE = 0.001
        SEAL_TAU_HR = 4000.0
        rul = max(0, SEAL_TAU_HR * np.log(0.01 / SEAL_DRIFT_BASE) - seal_age)
        is_fault = int(inject_oil or inject_hyst or seal_age > 3500)
        scenarios.append((
            {"seal_age_hr": seal_age,
             "inject_oil_contamination": inject_oil,
             "inject_hysteresis": inject_hyst},
            rul, is_fault,
        ))
    return scenarios


def _sample_scenarios_APT(n: int, rich: bool) -> List[Tuple[dict, float, int]]:
    rng = _rng()
    scenarios = []
    for _ in range(n):
        pickling_t = rng.uniform(0, 800 if rich else 500)
        inject_lining = rng.random() < 0.15
        inject_safety = rng.random() < 0.2
        # HCl depletion RUL
        K = 0.002; FEO = 5.0; LS = 80.0; W = 1.2; TH = 0.003
        rate = K * FEO * LS * W * TH
        HCL0 = 15.0
        hcl_now = max(0, HCL0 - rate * pickling_t)
        rul = max(0, (hcl_now - 12.0) / rate) if rate > 0 else 9999
        is_fault = int(inject_lining or inject_safety or hcl_now < 12.5)
        scenarios.append((
            {"pickling_time_hr": pickling_t,
             "inject_lining_failure": inject_lining,
             "inject_safety_breach": inject_safety},
            min(rul, 2000), is_fault,
        ))
    return scenarios


def _sample_scenarios_TCMS(n: int, rich: bool) -> List[Tuple[dict, float, int]]:
    rng = _rng()
    scenarios = []
    BASE_RUL = 2000.0
    RUL_FACTORS = {1: 1.0, 2: 0.6, 3: 0.25, 4: 0.0}
    for _ in range(n):
        stage = int(rng.choice([1, 1, 2, 3, 4] if rich else [1, 1, 2, 3]))
        inject_emul = rng.random() < 0.2
        rul = BASE_RUL * RUL_FACTORS[stage]
        is_fault = int(stage >= 3 or inject_emul)
        scenarios.append((
            {"bearing_stage": stage, "inject_emulsion_contamination": inject_emul},
            rul, is_fault,
        ))
    return scenarios


def _sample_scenarios_CGP(n: int, rich: bool) -> List[Tuple[dict, float, int]]:
    rng = _rng()
    scenarios = []
    for _ in range(n):
        pot_temp = rng.uniform(450, 472 if rich else 465)
        inject_exc = rng.random() < 0.25
        inject_bushing = rng.random() < 0.2
        bushing_wear = rng.uniform(0, 10 if rich else 7) if inject_bushing else 0.0
        is_fault = int(inject_exc or (inject_bushing and bushing_wear > 5) or pot_temp > 462)
        # CGP RUL: rough estimate based on dross rate relative to pot temp
        from apps.synthetic.generators.cgp import dross_rate
        dr = dross_rate(pot_temp)
        dr_alarm = dross_rate(462)
        # Normalize: higher dross rate → lower RUL
        rul = max(50, 3000 * (dr_alarm / max(dr, 1e-20)))
        scenarios.append((
            {"pot_temp": pot_temp,
             "inject_temp_excursion": inject_exc,
             "inject_bushing_wear": inject_bushing,
             "bushing_wear_mm": bushing_wear},
            rul, is_fault,
        ))
    return scenarios


def _sample_scenarios_HPAK(n: int, rich: bool) -> List[Tuple[dict, float, int]]:
    rng = _rng()
    scenarios = []
    for _ in range(n):
        blockage_t = rng.uniform(0, 2000 if rich else 1200)
        inject_cryst = rng.random() < 0.3
        block_factor = 1.0 - np.exp(-0.0001 * blockage_t) if inject_cryst else 0.0
        p_drop = 20.0 + block_factor * 200.0
        is_fault = int(inject_cryst and p_drop > 95)
        # RUL: minutes until p_drop > 95 mbar (blockage time to alarm)
        # 20 + (1-e^{-0.0001t})*200 = 95 → e^{-0.0001t} = (1-75/200) → t = -ln(0.625)/0.0001
        t_alarm = -np.log(0.625) / 0.0001  # ≈ 4700 min
        rul = max(0, (t_alarm - blockage_t) / 60)  # in hours
        scenarios.append((
            {"blockage_time_min": blockage_t, "inject_crystallization": inject_cryst},
            rul, is_fault,
        ))
    return scenarios


SCENARIO_SAMPLERS = {
    "SRF": _sample_scenarios_SRF,
    "HHPD": _sample_scenarios_HHPD,
    "FS": _sample_scenarios_FS,
    "HAGCC": _sample_scenarios_HAGCC,
    "APT": _sample_scenarios_APT,
    "TCMS": _sample_scenarios_TCMS,
    "CGP": _sample_scenarios_CGP,
    "HPAK": _sample_scenarios_HPAK,
}


def _import_generator(dotted_path: str):
    module_path, class_name = dotted_path.rsplit(".", 1)
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def _aggregate(samples, sensor_names) -> np.ndarray:
    """
    Given a list of SensorSample, pivot by sensor_name, aggregate over time.
    Returns 1D feature vector: [mean, std, min, max] per sensor.
    """
    sensor_vals: Dict[str, List[float]] = {s: [] for s in sensor_names}
    for sample in samples:
        if sample.sensor_name in sensor_vals:
            sensor_vals[sample.sensor_name].append(sample.value)

    row = []
    for sname in sensor_names:
        vals = sensor_vals[sname]
        if vals:
            arr = np.array(vals)
            row.extend([arr.mean(), arr.std(), arr.min(), arr.max()])
        else:
            row.extend([0.0, 0.0, 0.0, 0.0])
    return np.array(row, dtype=np.float32)


def _get_sensor_names(asset_type: str) -> List[str]:
    """Get sensor names by running a single sample generation."""
    gen_cls = _import_generator(GENERATOR_MAP[asset_type])
    gen = gen_cls(seed=0)
    out = gen.generate(n_samples=1, start_time=datetime.now(tz=timezone.utc))
    seen = []
    for sample in out.samples:
        if sample.sensor_name not in seen:
            seen.append(sample.sensor_name)
    return seen


def build_feature_names(asset_type: str) -> List[str]:
    sensor_names = _get_sensor_names(asset_type)
    names = []
    for s in sensor_names:
        for stat in ["mean", "std", "min", "max"]:
            names.append(f"{s}_{stat}")
    return names


def build_dataset(
    asset_type: str,
    n_scenarios: int = 300,
    rich: bool = False,
    seed: int = 42,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, List[str]]:
    """
    Returns:
        X              — (n_scenarios, n_features) float32
        y_rul          — (n_scenarios,) float32   RUL in hours
        y_fault        — (n_scenarios,) int8       0=normal 1=fault
        feature_names  — list of strings
    """
    if asset_type not in GENERATOR_MAP:
        raise ValueError(f"Unknown asset_type: {asset_type}")

    sampler = SCENARIO_SAMPLERS[asset_type]
    gen_cls = _import_generator(GENERATOR_MAP[asset_type])
    sensor_names = _get_sensor_names(asset_type)
    feature_names = build_feature_names(asset_type)

    scenarios = sampler(n_scenarios, rich=rich)

    X_rows, y_rul_rows, y_fault_rows = [], [], []
    for i, (gen_kwargs, rul, is_fault) in enumerate(scenarios):
        gen = gen_cls(seed=seed + i)
        try:
            out = gen.generate(
                n_samples=N_WINDOW,
                start_time=datetime.now(tz=timezone.utc),
                **gen_kwargs,
            )
        except Exception as exc:
            logger.warning("dataset_builder_skip asset=%s idx=%s error=%s", asset_type, i, str(exc))
            continue

        row = _aggregate(out.samples, sensor_names)
        if np.any(np.isnan(row)):
            row = np.nan_to_num(row)

        X_rows.append(row)
        y_rul_rows.append(float(rul))
        y_fault_rows.append(int(is_fault))

    if not X_rows:
        raise RuntimeError(f"No valid scenarios generated for {asset_type}")

    X = np.vstack(X_rows).astype(np.float32)
    y_rul = np.array(y_rul_rows, dtype=np.float32)
    y_fault = np.array(y_fault_rows, dtype=np.int8)

    logger.info("dataset_built asset_type=%s n_scenarios=%d n_features=%d fault_rate=%.3f", asset_type, len(X_rows), X.shape[1], y_fault.mean())
    return X, y_rul, y_fault, feature_names

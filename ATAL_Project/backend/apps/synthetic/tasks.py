"""
SyntheticDataOrchestrator Celery tasks.

Degradation model:
  - Each 30-second orchestrate_all batch advances campaign_hours by CAMPAIGN_ADVANCE_PER_BATCH.
  - Campaign hours drive generator parameters (nozzle erosion, crack growth, refractory wear).
  - As campaign_hours rises, generated sensor values drift toward fault thresholds → ML models
    predict lower RUL and higher anomaly_score → alerts fire → consolidation triggers.
  - A fault injection toggle (set via API) immediately maps campaign_hours to a critical level
    and enables fault injection flags for that batch, creating a detectable anomaly.
"""
import logging
from datetime import datetime, timezone
from celery import shared_task
from django.utils import timezone as dj_tz

logger = logging.getLogger(__name__)

# Campaign hours added per 30-second batch (demo speed: ~48h/day real time)
CAMPAIGN_ADVANCE_PER_BATCH = 2.0   # hours per batch

GENERATOR_MAP = {
    "SRF": "apps.synthetic.generators.srf.SRFSyntheticGenerator",
    "HHPD": "apps.synthetic.generators.hhpd.HHPDSyntheticGenerator",
    "FS": "apps.synthetic.generators.fs.FSSyntheticGenerator",
    "HAGCC": "apps.synthetic.generators.hagcc.HAGCCSyntheticGenerator",
    "APT": "apps.synthetic.generators.apt.APTSyntheticGenerator",
    "TCMS": "apps.synthetic.generators.tcms.TCMSSyntheticGenerator",
    "CGP": "apps.synthetic.generators.cgp.CGPSyntheticGenerator",
    "HPAK": "apps.synthetic.generators.hpak.HPAKSyntheticGenerator",
}

# Max campaign hours per asset type (beyond this → always fault-injected)
CAMPAIGN_MAX = {
    "SRF": 8000.0,
    "HHPD": 500.0,    # nozzle_cycles × 10, 5000 cycles max
    "FS": 6000.0,
    "HAGCC": 5000.0,
    "APT": 4000.0,
    "TCMS": 5000.0,
    "CGP": 6000.0,
    "HPAK": 300.0,    # blockage grows quickly
}


def _import_generator(dotted_path: str):
    module_path, class_name = dotted_path.rsplit(".", 1)
    import importlib
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def _get_campaign_state(asset) -> dict:
    """Read campaign state from AssetTwinState.state (no migration needed — uses JSONField)."""
    from apps.twins.models import AssetTwinState
    twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
    state = twin.state or {}
    return {
        "campaign_hours": float(state.get("_campaign_hours", 0.0)),
        "fault_injected": bool(state.get("_fault_injected", False)),
        "fault_type": state.get("_fault_type", "general"),
        "reset_requested": bool(state.get("_reset_requested", False)),
    }


def _save_campaign_state(asset, campaign_hours: float, *, fault_injected: bool = None,
                          fault_type: str = None, clear_fault: bool = False,
                          clear_reset: bool = False):
    """Persist campaign state back to AssetTwinState.state."""
    from apps.twins.models import AssetTwinState
    twin, _ = AssetTwinState.objects.get_or_create(asset=asset)
    state = dict(twin.state or {})
    state["_campaign_hours"] = round(campaign_hours, 2)
    if fault_injected is not None:
        state["_fault_injected"] = fault_injected
    if fault_type is not None:
        state["_fault_type"] = fault_type
    if clear_fault:
        state["_fault_injected"] = False
        state["_fault_type"] = None
    if clear_reset:
        state["_reset_requested"] = False
    twin.state = state
    twin.save(update_fields=["state", "updated_at"])


def _build_gen_kwargs(asset_type: str, campaign_hours: float, fault_injected: bool, fault_type: str) -> dict:
    """
    Map campaign_hours → generator-specific kwargs matching exact generator signatures.
    Fault injection immediately forces fault conditions regardless of campaign state.
    """
    h = campaign_hours
    cmax = CAMPAIGN_MAX.get(asset_type, 5000.0)
    degrade_pct = min(1.0, h / cmax)       # 0.0 = fresh, 1.0 = end-of-life
    is_degraded = degrade_pct > 0.4        # moderate degradation
    is_worn = degrade_pct > 0.7            # severe wear

    if asset_type == "SRF":
        # SRF: campaign_time_hr, inject_underheating, inject_refractory_degradation, inject_seal_drift
        return {
            "campaign_time_hr": h,
            "inject_underheating": fault_injected or (is_worn and fault_type in ("thermal", "general")),
            "inject_refractory_degradation": is_degraded or fault_injected,
            "inject_seal_drift": is_worn or fault_injected,
        }
    elif asset_type == "HHPD":
        # HHPD: nozzle_cycles (int), inject_cavitation (bool)
        nozzle_cycles = min(int(h * 10), 5000)
        return {
            "nozzle_cycles": nozzle_cycles,
            "inject_cavitation": fault_injected or is_worn,
        }
    elif asset_type == "FS":
        # FS: crack_size_mm, roll_revs, inject_chatter, inject_chock_wear
        crack_size = 0.001 * (1.0 + degrade_pct * 50.0)
        return {
            "crack_size_mm": crack_size if (is_degraded or fault_injected) else 0.001,
            "roll_revs": int(h * 1000),
            "inject_chatter": fault_injected or is_worn,
            "inject_chock_wear": is_worn or fault_injected,
        }
    elif asset_type == "HAGCC":
        # HAGCC: seal_age_hr, inject_oil_contamination, inject_hysteresis
        return {
            "seal_age_hr": h,
            "inject_oil_contamination": is_degraded or fault_injected,
            "inject_hysteresis": fault_injected or is_worn,
        }
    elif asset_type == "APT":
        # APT: pickling_time_hr, inject_lining_failure, inject_safety_breach
        return {
            "pickling_time_hr": h,
            "inject_lining_failure": is_worn or fault_injected,
            "inject_safety_breach": fault_injected and fault_type in ("safety", "general"),
        }
    elif asset_type == "TCMS":
        # TCMS: bearing_stage (1-4), inject_emulsion_contamination
        stage = min(4, 1 + int(degrade_pct * 3))
        return {
            "bearing_stage": stage if (is_degraded or fault_injected) else 1,
            "inject_emulsion_contamination": is_degraded or fault_injected,
        }
    elif asset_type == "CGP":
        # CGP: pot_temp, inject_temp_excursion, inject_bushing_wear, bushing_wear_mm
        bushing_wear = degrade_pct * 2.0  # 0 to 2mm over life
        return {
            "inject_temp_excursion": fault_injected or is_worn,
            "inject_bushing_wear": is_degraded or fault_injected,
            "bushing_wear_mm": bushing_wear if is_degraded else 0.0,
        }
    elif asset_type == "HPAK":
        # HPAK: blockage_time_min, inject_crystallization
        # Fault injection: jump to 5000 min blockage → block_factor≈0.39 → pressure>95mbar alarm
        # Natural degradation: h*2 min (slow, linear)
        blockage_time_min = 5000.0 if fault_injected else min(h * 2.0, 4800.0)
        return {
            "blockage_time_min": blockage_time_min,
            "inject_crystallization": fault_injected or is_worn,
        }
    return {}


@shared_task(name="apps.synthetic.generate_batch", bind=True)
def generate_batch(self, asset_id: str, n_samples: int = 100, **gen_kwargs):
    """
    Generate a batch of synthetic sensor readings with campaign-aware degradation.
    Reads campaign state from AssetTwinState, increments it, generates data,
    then triggers twin update + alert evaluation.
    """
    from apps.assets.models import Asset
    from apps.telemetry.models import SensorReading
    from apps.assets.models import SensorDefinition
    from apps.synthetic.models import SyntheticGenerationRun
    import math

    try:
        asset = Asset.objects.get(id=asset_id)
        campaign = _get_campaign_state(asset)
        campaign_hours = campaign["campaign_hours"]
        fault_injected = campaign["fault_injected"]
        fault_type = campaign["fault_type"] or "general"
        reset_requested = campaign["reset_requested"]

        # Handle reset
        if reset_requested:
            campaign_hours = 0.0
            fault_injected = False
            _save_campaign_state(asset, 0.0, fault_injected=False, fault_type=None,
                                 clear_fault=True, clear_reset=True)
            logger.info("campaign_reset asset=%s", asset.asset_type)

        # Override gen_kwargs with campaign-aware params if not explicitly provided
        if not gen_kwargs or gen_kwargs.get("_use_campaign", True):
            gen_kwargs = _build_gen_kwargs(asset.asset_type, campaign_hours, fault_injected, fault_type)
        gen_kwargs.pop("_use_campaign", None)

        gen_cls = _import_generator(GENERATOR_MAP[asset.asset_type])
        gen = gen_cls()
        output = gen.generate(n_samples=n_samples, start_time=datetime.now(tz=timezone.utc), **gen_kwargs)

        run = SyntheticGenerationRun.objects.create(
            asset=asset,
            generator_name=gen_cls.__name__,
            celery_task_id=self.request.id or "",
        )

        sensor_map = {s.sensor_name: s for s in SensorDefinition.objects.filter(asset=asset)}
        bulk = []
        for sample in output.samples:
            if math.isnan(sample.value):
                continue
            sdef = sensor_map.get(sample.sensor_name)
            if not sdef:
                continue
            bulk.append(SensorReading(
                time=sample.timestamp,
                asset=asset,
                sensor_def=sdef,
                value=sample.value,
                quality_flag=sample.quality_flag,
                source=SensorReading.Source.SYNTHETIC,
                condition_type=sample.condition_type or "",
            ))

        SensorReading.objects.bulk_create(bulk, batch_size=500, ignore_conflicts=True)

        run.rows_generated = len(bulk)
        run.fault_events_injected = len(output.fault_events)
        run.completed_at = dj_tz.now()
        run.save()

        # Advance campaign hours (slow degradation)
        new_hours = campaign_hours + CAMPAIGN_ADVANCE_PER_BATCH
        _save_campaign_state(
            asset, new_hours,
            # Clear fault injection flag after one batch (one-shot trigger)
            fault_injected=False if fault_injected else None,
            clear_fault=fault_injected,
        )

        # Update twin state with latest telemetry averages
        try:
            from apps.twins.engine import TwinStateEngine
            TwinStateEngine.update(str(asset.id))
        except Exception as twin_exc:
            logger.warning("twin_update_failed asset_id=%s error=%s", asset_id, str(twin_exc))

        # Real-time threshold alerting after every batch
        try:
            from apps.alerts.tasks import evaluate_thresholds
            evaluate_thresholds.apply_async(args=[str(asset.id)])
        except Exception as alert_exc:
            logger.warning("alert_eval_failed asset_id=%s error=%s", asset_id, str(alert_exc))

        # On fault injection: immediately run ML inference + trigger consolidation analysis
        if fault_injected or len(output.fault_events) > 0:
            logger.info(
                "fault_detected asset=%s campaign_h=%.1f fault_events=%d — triggering immediate analysis",
                asset.asset_type, new_hours, len(output.fault_events),
            )
            try:
                from apps.ml.tasks import run_all_asset_models
                run_all_asset_models.apply_async(args=[str(asset.id)], queue="ml_inference")
            except Exception as ml_exc:
                logger.warning("ml_inference_trigger_failed error=%s", str(ml_exc))

            try:
                from apps.consolidation.tasks import run_consolidation
                run_consolidation.apply_async(args=[str(asset.id)], queue="default")
            except Exception as cons_exc:
                logger.warning("consolidation_trigger_failed error=%s", str(cons_exc))

        logger.info(
            "synthetic_batch asset=%s rows=%d fault_events=%d campaign_h=%.1f",
            asset.name, len(bulk), len(output.fault_events), new_hours,
        )
        return {"rows": len(bulk), "fault_events": len(output.fault_events), "campaign_hours": new_hours}

    except Exception as exc:
        logger.error("synthetic_batch_error asset_id=%s error=%s", asset_id, str(exc))
        raise


@shared_task(name="apps.synthetic.orchestrate_all")
def orchestrate_all(n_samples: int = 50):
    from apps.assets.models import Asset
    for asset in Asset.objects.all():
        generate_batch.apply_async(args=[str(asset.id)], kwargs={"n_samples": n_samples})


@shared_task(name="apps.synthetic.generate_training_dataset", bind=True)
def generate_training_dataset(self, n_scenarios: int = 1000):
    """Weekly training dataset refresh (Celery Beat: Sunday 01:30 UTC)."""
    from apps.synthetic.dataset_builder import build_dataset
    results = {}
    for asset_type in GENERATOR_MAP:
        try:
            X, y_rul, y_fault, feature_names = build_dataset(
                asset_type, n_scenarios=n_scenarios, rich=True
            )
            results[asset_type] = {
                "n_scenarios": int(X.shape[0]),
                "n_features": int(X.shape[1]),
                "fault_rate": round(float(y_fault.mean()), 3),
            }
        except Exception as exc:
            logger.error("training_dataset_error asset_type=%s error=%s", asset_type, str(exc))
            results[asset_type] = {"error": str(exc)}
    return results

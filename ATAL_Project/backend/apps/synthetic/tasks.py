"""
SyntheticDataOrchestrator Celery tasks.
Runs all generators on Beat schedule, writes to TimescaleDB via ingest API.
"""
import logging
from datetime import datetime, timezone
from celery import shared_task
from django.utils import timezone as dj_tz

logger = logging.getLogger(__name__)

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


def _import_generator(dotted_path: str):
    module_path, class_name = dotted_path.rsplit(".", 1)
    import importlib
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


@shared_task(name="apps.synthetic.generate_batch", bind=True)
def generate_batch(self, asset_id: str, n_samples: int = 100, **gen_kwargs):
    from apps.assets.models import Asset
    from apps.telemetry.models import SensorReading
    from apps.assets.models import SensorDefinition
    from apps.synthetic.models import SyntheticGenerationRun
    import math

    try:
        asset = Asset.objects.get(id=asset_id)
        gen_cls = _import_generator(GENERATOR_MAP[asset.asset_type])
        gen = gen_cls()
        output = gen.generate(n_samples=n_samples, start_time=datetime.now(tz=timezone.utc), **gen_kwargs)

        run = SyntheticGenerationRun.objects.create(
            asset=asset,
            generator_name=gen_cls.__name__,
            celery_task_id=self.request.id,
        )

        # Ingest samples into TimescaleDB
        sensor_map = {
            s.sensor_name: s
            for s in SensorDefinition.objects.filter(asset=asset)
        }
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

        logger.info(
            "synthetic_batch_complete",
            asset=asset.name,
            rows=len(bulk),
            fault_events=len(output.fault_events),
        )
        return {"rows": len(bulk), "fault_events": len(output.fault_events)}

    except Exception as exc:
        logger.error("synthetic_batch_error", asset_id=asset_id, error=str(exc))
        raise


@shared_task(name="apps.synthetic.orchestrate_all")
def orchestrate_all(n_samples: int = 50):
    from apps.assets.models import Asset
    for asset in Asset.objects.all():
        generate_batch.apply_async(args=[str(asset.id)], kwargs={"n_samples": n_samples})

"""
manage.py seed_maintenance_logs

Creates historical MaintenanceEvent records and indexes them into MaintenanceLog Chroma collection.
"""
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.assets.models import Asset
from apps.maintenance.models import MaintenanceEvent
from apps.rag.tasks import ingest_maintenance_log

SCENARIOS = [
    ("SRF", MaintenanceEvent.EventType.CORRECTIVE, "Burner zone temperature drift +18°C above setpoint", "Replaced faulty thermocouple zone 3; recalibrated air/fuel ratio to 1.10", ["TC-SRF-Z3-001"], "refractory_erosion"),
    ("HHPD", MaintenanceEvent.EventType.PREDICTIVE, "Header pressure drop from 390 to 352 bar — nozzle erosion detected", "Replaced 6 tungsten carbide nozzles; pressure restored to 385 bar", ["NOZ-HHPD-TC-6"], "nozzle_erosion"),
    ("FS", MaintenanceEvent.EventType.CORRECTIVE, "Chock vibration 5.2 mm/s RMS — ISO 10816-3 Zone C", "Roll bearing replacement stand F4; vibration reduced to 2.1 mm/s", ["BRG-FS-F4-WORK"], "bearing_spallation"),
    ("HAGCC", MaintenanceEvent.EventType.PREVENTIVE, "Hydraulic oil ISO 4406 code 18/16/13 — above alarm threshold", "Full oil flush and filter replacement; cleanliness restored to 16/14/11", ["FLT-HAGCC-10UM", "OIL-VG46-200L"], "seal_extrusion"),
    ("APT", MaintenanceEvent.EventType.CORRECTIVE, "Tank lining pinhole detected — free HCl drop", "Emergency strip feed stop; lining patch repair 2m² section", ["LINING-EPOXY-KIT"], "lining_failure"),
    ("TCMS", MaintenanceEvent.EventType.PREDICTIVE, "BPFO amplitude -14 dB at 142 Hz — bearing stage 3 wear", "Stand 3 work roll bearing change during scheduled outage", ["BRG-TCMS-WR3"], "bearing_wear"),
    ("CGP", MaintenanceEvent.EventType.CORRECTIVE, "Pot temperature excursion to 468°C — dross rate spike", "Emergency zinc skim; sink roll bushing replacement", ["BUSH-CGP-SINK-02"], "dross_formation"),
    ("HPAK", MaintenanceEvent.EventType.PREDICTIVE, "Coating weight stripes ±12 g/m² — nozzle slot blockage", "Mechanical slot cleaner traverse + blower filter change", ["FLT-HPAK-BLOWER"], "nozzle_blockage"),
    ("SRF", MaintenanceEvent.EventType.INSPECTION, "Walking beam stroke drift 8mm beyond tolerance", "Hydraulic skid seal replacement; stroke recalibrated", ["SEAL-SRF-BEAM"], "seal_creep"),
    ("TCMS", MaintenanceEvent.EventType.PREVENTIVE, "Emulsion iron content 285 ppm — above 200 ppm target", "Emulsion filtration system service; iron reduced to 145 ppm", ["FLT-EMUL-5UM"], "contamination"),
]


class Command(BaseCommand):
    help = "Seed historical maintenance events and index into RAG MaintenanceLog collection."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=48, help="Number of events to create.")
        parser.add_argument("--sync", action="store_true", help="Ingest synchronously (no Celery).")
        parser.add_argument("--force", action="store_true", help="Create events even if count already met.")

    def handle(self, *args, **options):
        assets = {a.asset_type: a for a in Asset.objects.all()}
        if not assets:
            self.stderr.write(self.style.ERROR("No assets found. Run seed_fixtures first."))
            return

        existing = MaintenanceEvent.objects.count()
        if existing >= options["count"] and not options["force"]:
            self.stdout.write(f"Already {existing} maintenance events — skipping (use --force).")
            self._ingest_existing(options["sync"])
            return

        created = 0
        now = timezone.now()
        for i in range(options["count"]):
            asset_type, event_type, description, outcome, parts, iso_class = SCENARIOS[i % len(SCENARIOS)]
            asset = assets.get(asset_type)
            if not asset:
                continue
            days_ago = random.randint(1, 365)
            completed = now - timedelta(days=days_ago)
            event = MaintenanceEvent.objects.create(
                asset=asset,
                event_type=event_type,
                description=description,
                outcome=outcome,
                parts_used=parts,
                iso14224_classification=iso_class,
                completed_date=completed,
                downtime_hours=round(random.uniform(0.5, 12.0), 1),
            )
            if options["sync"]:
                ingest_maintenance_log(str(event.id))
            else:
                ingest_maintenance_log.apply_async(args=[str(event.id)])
            created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} maintenance events and queued RAG ingest."))

    def _ingest_existing(self, sync: bool):
        from apps.rag.tasks import ingest_document
        from apps.rag.models import Document

        for event in MaintenanceEvent.objects.select_related("asset").all():
            doc_title = f"MaintenanceLog:{event.id}"
            doc, _ = Document.objects.get_or_create(
                title=doc_title,
                defaults={
                    "doc_type": Document.DocType.MAINTENANCE_LOG,
                    "asset_scope": [event.asset.asset_type],
                    "chroma_collection": "MaintenanceLog",
                },
            )
            if not doc.is_ingested:
                body = (
                    f"Asset: {event.asset.asset_type}\n"
                    f"Event: {event.event_type}\n"
                    f"Description: {event.description}\n"
                    f"Outcome: {event.outcome}\n"
                    f"Parts: {', '.join(event.parts_used or [])}\n"
                    f"ISO14224: {event.iso14224_classification}\n"
                    f"Date: {event.completed_date}"
                )
                doc.source_url = ""
                doc.local_path = ""
                doc.save()
                if sync:
                    ingest_document(str(doc.id), force=True)
                else:
                    ingest_document.apply_async(args=[str(doc.id), True])

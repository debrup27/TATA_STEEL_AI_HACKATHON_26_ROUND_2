"""
manage.py ingest_corpus

Ingests OEM manuals, ISO standards, SOPs, and safety codes into ChromaDB.
"""
from django.core.management.base import BaseCommand
from apps.rag.models import Document
from apps.rag.tasks import ingest_document

ISO_DOCUMENTS = [
    {"title": "ISO 10816-3 Mechanical Vibration", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["FS", "TCMS"], "local_path": ""},
    {"title": "ISO 4406 Hydraulic Oil Cleanliness", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["HAGCC"], "local_path": ""},
    {"title": "ISO 17359 Condition Monitoring", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["HPAK", "TCMS", "FS"], "local_path": "iso_standard/iso-17359-sample.pdf"},
    {"title": "ISO 13373-3 Bearing Fault Frequencies", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["TCMS", "FS"], "local_path": ""},
    {"title": "ISO 19973 Seal Reliability Curves", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["HAGCC"], "local_path": ""},
    {"title": "ISO 14224 Maintenance Data Collection", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["SRF", "HHPD", "FS", "HAGCC", "APT", "TCMS", "CGP", "HPAK"], "local_path": ""},
    {"title": "IEC 61511 Functional Safety SIS", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["SRF"], "local_path": ""},
    {"title": "IEC 61508 Functional Safety E/E/PE", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["SRF"], "local_path": ""},
    {"title": "IEC 62682 Alarm Management", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["SRF"], "local_path": ""},
    {"title": "ISO 12944 Corrosion Protection", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["APT"], "local_path": ""},
    {"title": "ISO 1461 Hot Dip Galvanized Coatings", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["CGP"], "local_path": ""},
    {"title": "ISO 1460 Coating Mass Determination", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["HPAK"], "local_path": ""},
    {"title": "ISO 6085 Coating Uniformity", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["HPAK"], "local_path": ""},
]

SOP_DOCUMENTS = [
    {"title": "SRF Combustion Control SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["SRF"], "local_path": ""},
    {"title": "SRF Startup Operation SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["SRF"], "local_path": "sop/srf-startup-sop.md", "source_url": "https://www.scribd.com/document/643753626/SOP-BM-RHF-OPRN-PROCEDURE"},
    {"title": "HHPD Nozzle Inspection SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["HHPD"], "local_path": ""},
    {"title": "FS Roll Change Procedure SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["FS"], "local_path": ""},
    {"title": "HAGCC Oil Sampling SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["HAGCC"], "local_path": ""},
    {"title": "APT Acid Bath Replenishment SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["APT"], "local_path": ""},
    {"title": "TCMS Bearing Vibration SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["TCMS"], "local_path": ""},
    {"title": "CGP Pot Temperature Management SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["CGP"], "local_path": ""},
    {"title": "HPAK Knife Purge Procedure SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["HPAK"], "local_path": ""},
]

SAFETY_DOCUMENTS = [
    {"title": "Hot Work Permit Safety Code", "doc_type": "safety_code", "chroma_collection": "SafetyCode", "asset_scope": ["SRF", "CGP"], "local_path": ""},
    {"title": "Acid Handling Emergency Procedure", "doc_type": "safety_code", "chroma_collection": "SafetyCode", "asset_scope": ["APT"], "local_path": ""},
    {"title": "High Pressure Safety Isolation SOP", "doc_type": "safety_code", "chroma_collection": "SafetyCode", "asset_scope": ["HHPD", "HAGCC", "HPAK"], "local_path": ""},
    {"title": "OSHA 1910.147 Lockout Tagout", "doc_type": "safety_code", "chroma_collection": "SafetyCode", "asset_scope": ["APT", "FS", "TCMS"], "local_path": "safety_code/osha-1910-147.html", "source_url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147"},
]

EQUIPMENT_MANUALS = [
    {"title": "Danieli DANOIL Oil-Film Bearings Manual", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["FS"], "local_path": "equipment_manual/danieli-danoil.pdf", "source_url": "https://www.danieli.com/media/download/danoil-2021-en.pdf"},
    {"title": "Parker Gen II HAGCC Cylinder Catalog", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["HAGCC"], "local_path": "equipment_manual/parker-hy08-hagcc.pdf", "source_url": "https://www.parker.com/content/dam/Parker-com/Literature/Industrial-Cylinder/cylinder/cat/english/GenII_HY08-1314_2H_3H_Family.pdf"},
    {"title": "SKF Bearing Installation Guide", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["FS", "TCMS"], "local_path": "equipment_manual/skf-bearing-installation.pdf"},
    {"title": "SKF Bearing Maintenance Handbook", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["FS", "TCMS"], "local_path": "equipment_manual/skf-bearing-maintenance.pdf"},
    {"title": "Schaeffler FAG Mounting Guide", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["FS", "TCMS"], "local_path": "equipment_manual/schaeffler-fag-mounting.pdf"},
    {"title": "Emerson Fisher Control Valve Handbook", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["HAGCC", "APT"], "local_path": "equipment_manual/emerson-fisher-valve.pdf"},
    {"title": "Siemens S7-1200 System Manual", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["SRF", "HHPD"], "local_path": "equipment_manual/siemens-s7-1200.pdf"},
    {"title": "Rockwell Logix 5000 Manual", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["SRF", "HHPD"], "local_path": "equipment_manual/rockwell-logix-5000.pdf"},
    {"title": "HHPD Descaler Factsheet", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["HHPD"], "local_path": "equipment_manual/hhpd-descaler-factsheet.pdf"},
    {"title": "TCMS Process Guidelines", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["TCMS"], "local_path": "equipment_manual/tcms-process-guide.html", "source_url": "https://www.ispatguru.com/tandem-cold-mill/"},
    {"title": "Continuous Galvanizing Line Guide", "doc_type": "manual", "chroma_collection": "EquipmentManual", "asset_scope": ["CGP", "HPAK"], "local_path": "equipment_manual/galvanizing-line-guide.pdf"},
]

ALL_DOCUMENTS = ISO_DOCUMENTS + SOP_DOCUMENTS + SAFETY_DOCUMENTS + EQUIPMENT_MANUALS


class Command(BaseCommand):
    help = "Ingest RAG corpus (OEM manuals, ISO standards, SOPs, safety codes) into ChromaDB."

    def add_arguments(self, parser):
        parser.add_argument("--sync", action="store_true", help="Run synchronously (no Celery).")
        parser.add_argument("--force", action="store_true", help="Re-ingest even if already indexed.")
        parser.add_argument("--corpus-dir", default="", help="Override CORPUS_DIR for this run.")

    def handle(self, *args, **options):
        import os
        from django.conf import settings

        if options["corpus_dir"]:
            os.environ["CORPUS_DIR"] = options["corpus_dir"]
            settings.CORPUS_DIR = options["corpus_dir"]

        queued = 0
        for doc_spec in ALL_DOCUMENTS:
            defaults = {
                "doc_type": doc_spec["doc_type"],
                "chroma_collection": doc_spec["chroma_collection"],
                "asset_scope": doc_spec["asset_scope"],
                "source_url": doc_spec.get("source_url", ""),
                "local_path": doc_spec.get("local_path", ""),
            }
            doc, created = Document.objects.get_or_create(
                title=doc_spec["title"],
                defaults=defaults,
            )
            if not created:
                updated = False
                for field in ("local_path", "source_url", "asset_scope", "chroma_collection", "doc_type"):
                    val = defaults.get(field)
                    if val and getattr(doc, field) != val:
                        setattr(doc, field, val)
                        updated = True
                if updated:
                    doc.save()
                if options["force"]:
                    doc.is_ingested = False
                    doc.save(update_fields=["is_ingested"])

            if options["sync"]:
                ingest_document(str(doc.id), force=options["force"])
            else:
                ingest_document.apply_async(args=[str(doc.id), options["force"]])
            queued += 1
            status = "created" if created else "existing"
            self.stdout.write(f"  [{status}] {doc.title}")

        self.stdout.write(self.style.SUCCESS(f"Queued {queued} documents for ingestion."))

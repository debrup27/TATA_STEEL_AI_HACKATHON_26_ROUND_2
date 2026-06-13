"""
manage.py ingest_corpus

Ingests the known OEM manuals and ISO/SOP documents into ChromaDB.
Creates Document records and dispatches ingest_document Celery tasks.
"""
from django.core.management.base import BaseCommand
from apps.rag.models import Document
from apps.rag.tasks import ingest_document

ISO_DOCUMENTS = [
    {"title": "ISO 10816-3 Mechanical Vibration", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["FS", "TCMS"]},
    {"title": "ISO 4406 Hydraulic Oil Cleanliness", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["HAGCC"]},
    {"title": "ISO 17359 Condition Monitoring", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["HPAK", "TCMS", "FS"]},
    {"title": "ISO 13373-3 Bearing Fault Frequencies", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["TCMS", "FS"]},
    {"title": "ISO 19973 Seal Reliability Curves", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["HAGCC"]},
    {"title": "ISO 14224 Maintenance Data Collection", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["SRF", "HHPD", "FS", "HAGCC", "APT", "TCMS", "CGP", "HPAK"]},
    {"title": "IEC 61511 Functional Safety SIS", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["SRF"]},
    {"title": "IEC 61508 Functional Safety E/E/PE", "doc_type": "iso_standard", "chroma_collection": "ISOStandard", "asset_scope": ["SRF"]},
]

SOP_DOCUMENTS = [
    {"title": "SRF Combustion Control SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["SRF"]},
    {"title": "HHPD Nozzle Inspection SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["HHPD"]},
    {"title": "FS Roll Change Procedure SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["FS"]},
    {"title": "HAGCC Oil Sampling SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["HAGCC"]},
    {"title": "APT Acid Bath Replenishment SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["APT"]},
    {"title": "TCMS Bearing Vibration SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["TCMS"]},
    {"title": "CGP Pot Temperature Management SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["CGP"]},
    {"title": "HPAK Knife Purge Procedure SOP", "doc_type": "sop", "chroma_collection": "SOP", "asset_scope": ["HPAK"]},
]

SAFETY_DOCUMENTS = [
    {"title": "Hot Work Permit Safety Code", "doc_type": "safety_code", "chroma_collection": "SafetyCode", "asset_scope": ["SRF", "CGP"]},
    {"title": "Acid Handling Emergency Procedure", "doc_type": "safety_code", "chroma_collection": "SafetyCode", "asset_scope": ["APT"]},
    {"title": "High Pressure Safety Isolation SOP", "doc_type": "safety_code", "chroma_collection": "SafetyCode", "asset_scope": ["HHPD", "HAGCC", "HPAK"]},
]

ALL_DOCUMENTS = ISO_DOCUMENTS + SOP_DOCUMENTS + SAFETY_DOCUMENTS


class Command(BaseCommand):
    help = "Ingest RAG corpus (ISO standards, SOPs, safety codes) into ChromaDB."

    def add_arguments(self, parser):
        parser.add_argument("--sync", action="store_true", help="Run synchronously (no Celery).")

    def handle(self, *args, **options):
        queued = 0
        for doc_spec in ALL_DOCUMENTS:
            doc, created = Document.objects.get_or_create(
                title=doc_spec["title"],
                defaults={
                    "doc_type": doc_spec["doc_type"],
                    "chroma_collection": doc_spec["chroma_collection"],
                    "asset_scope": doc_spec["asset_scope"],
                    "source_url": "",
                },
            )
            if options["sync"]:
                ingest_document(str(doc.id))
            else:
                ingest_document.apply_async(args=[str(doc.id)])
            queued += 1
            status = "created" if created else "existing"
            self.stdout.write(f"  [{status}] {doc.title}")

        self.stdout.write(self.style.SUCCESS(f"Queued {queued} documents for ingestion."))

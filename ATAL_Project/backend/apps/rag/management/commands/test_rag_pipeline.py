"""Validation gates P2-043 through P2-045 for RAG pipeline."""
import sys

from django.core.management.base import BaseCommand

from apps.rag.chroma_client import COLLECTIONS, get_chroma_client
from apps.rag.embedder import embed_chunk
from apps.rag.reranker import rerank
from apps.rag.retrieval import retrieve_iso_compliance, retrieve_sop, retrieve_asset_intelligence
from apps.assets.models import Asset


class Command(BaseCommand):
    help = "Run RAG pipeline validation gates (P2-043, P2-044, P2-045)."

    def handle(self, *args, **options):
        failures = []

        # P2-043 embedding
        vec = embed_chunk("bearing vibration ISO 10816 threshold")
        if len(vec) != 1024:
            failures.append(f"P2-043: expected 1024-dim embedding, got {len(vec)}")
        else:
            self.stdout.write(self.style.SUCCESS("P2-043 PASS: BGE-M3 embedding 1024-dim"))

        # P2-044 reranker (optional — disabled when RAG_USE_RERANKER=0 to save VRAM)
        from django.conf import settings
        if settings.RAG_USE_RERANKER:
            sample = [{"properties": {"content": "ISO 4406 hydraulic oil cleanliness code 16/14/11 for HAGCC"}}]
            ranked = rerank("HAGCC oil cleanliness ISO 4406", sample)
            if not ranked or "reranker_score" not in ranked[0]:
                failures.append("P2-044: reranker_score missing")
            else:
                self.stdout.write(self.style.SUCCESS(f"P2-044 PASS: reranker_score={ranked[0]['reranker_score']:.3f}"))
        else:
            self.stdout.write(self.style.WARNING("P2-044 SKIP: RAG_USE_RERANKER=0"))

        # P2-045 collection counts
        client = get_chroma_client()
        for coll_name in COLLECTIONS:
            try:
                count = client.get_or_create_collection(coll_name).count()
                self.stdout.write(f"  Chroma {coll_name}: {count} chunks")
                if count == 0 and coll_name in ("ISOStandard", "SOP", "SafetyCode"):
                    failures.append(f"P2-045: {coll_name} collection empty — run ingest_corpus")
            except Exception as exc:
                failures.append(f"P2-045: Chroma {coll_name} error: {exc}")

        # P2-045 retrieval — ISO 4406 exact threshold
        iso_hits = retrieve_iso_compliance(asset_type="HAGCC", query="ISO 4406 HAGCC cleanliness target code")
        iso_text = " ".join(h.get("properties", {}).get("content", "") for h in iso_hits)
        if "16/14/11" not in iso_text:
            failures.append("P2-045: ISO 4406 retrieval missing exact threshold 16/14/11")
        else:
            self.stdout.write(self.style.SUCCESS("P2-045 PASS: ISO 4406 16/14/11 retrieved"))

        # P2-045 SOP / vibration
        sop_hits = retrieve_sop("TCMS", "bearing vibration action level trip alarm")
        sop_text = " ".join(h.get("properties", {}).get("content", "") for h in sop_hits)
        if not any(k in sop_text for k in ("4.5", "7.1", "10816", "mm/s")):
            failures.append("P2-045: TCMS vibration SOP/ISO thresholds not retrieved")
        else:
            self.stdout.write(self.style.SUCCESS("P2-045 PASS: vibration thresholds in SOP/ISO results"))

        # P2-045 maintenance log
        tcms = Asset.objects.filter(asset_type="TCMS").first()
        if tcms:
            maint_hits = retrieve_asset_intelligence(str(tcms.id), "bearing spall corrective action replacement")
            maint_text = " ".join(h.get("properties", {}).get("content", "") for h in maint_hits)
            if "bearing" not in maint_text.lower():
                failures.append("P2-045: MaintenanceLog retrieval missing bearing events")
            else:
                self.stdout.write(self.style.SUCCESS("P2-045 PASS: MaintenanceLog retrieval works"))
        else:
            self.stdout.write(self.style.WARNING("P2-045 SKIP: no TCMS asset — run seed_fixtures"))

        # P2-045 rerank score on live retrieval
        if settings.RAG_USE_RERANKER and iso_hits:
            reranked = rerank("ISO 4406 HAGCC cleanliness", iso_hits, top_k=3)
            top_score = reranked[0].get("reranker_score", 0) if reranked else 0
            if top_score <= 0:
                failures.append(f"P2-045: top reranker_score too low ({top_score})")
            else:
                self.stdout.write(self.style.SUCCESS(f"P2-045 PASS: top reranker_score={top_score}"))

        if failures:
            for f in failures:
                self.stderr.write(self.style.ERROR(f"FAIL: {f}"))
            sys.exit(1)

        self.stdout.write(self.style.SUCCESS("All RAG pipeline gates passed."))

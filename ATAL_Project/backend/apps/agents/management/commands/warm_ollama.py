from django.core.management.base import BaseCommand

from apps.agents.ollama_warmup import warm_inference_stack


class Command(BaseCommand):
    help = "Pre-load Ollama LLMs and RAG models to avoid cold-start latency on first chat"

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-rag",
            action="store_true",
            help="Only warm Ollama models (skip BGE embedder/reranker)",
        )

    def handle(self, *args, **options):
        result = warm_inference_stack(rag=not options["skip_rag"])
        ollama = result.get("ollama", {})
        ollama_ok = all(ollama.values())
        rag_ok = all(result.get("rag", {}).values()) if "rag" in result else True
        if ollama_ok and rag_ok:
            self.stdout.write(self.style.SUCCESS(f"Warmup complete: {result}"))
            return
        if not ollama_ok:
            failed = [m for m, ok in ollama.items() if not ok]
            self.stderr.write(self.style.ERROR(f"Required Ollama models failed: {failed}"))
            raise SystemExit(1)
        self.stdout.write(self.style.WARNING(f"Warmup partial (RAG only): {result}"))

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
        ollama_ok = all(result.get("ollama", {}).values())
        rag_ok = all(result.get("rag", {}).values()) if "rag" in result else True
        if ollama_ok and rag_ok:
            self.stdout.write(self.style.SUCCESS(f"Warmup complete: {result}"))
        else:
            self.stdout.write(self.style.WARNING(f"Warmup partial: {result}"))

from django.apps import AppConfig


class AssetsConfig(AppConfig):
    name = "apps.assets"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        try:
            from apps.rag.chroma_client import init_collections
            init_collections()
        except Exception:
            pass  # ChromaDB may not be ready at import time (migrations, tests)

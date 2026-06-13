"""ChromaDB client — embedded, no external service (REQ-SECURITY-005)."""
import chromadb
from chromadb.config import Settings
from django.conf import settings

_client = None


def get_chroma_client() -> chromadb.Client:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


# Collection names matching former Weaviate collections
COLLECTIONS = [
    "EquipmentManual",
    "SOP",
    "ISOStandard",
    "MaintenanceLog",
    "ModelExplanation",
    "SafetyCode",
]


def init_collections():
    """Ensure all ChromaDB collections exist (idempotent)."""
    client = get_chroma_client()
    for name in COLLECTIONS:
        client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )

import uuid
from django.db import models


class Document(models.Model):
    class DocType(models.TextChoices):
        MANUAL = "manual", "Equipment Manual"
        SOP = "sop", "SOP"
        ISO_STANDARD = "iso_standard", "ISO Standard"
        MAINTENANCE_LOG = "maintenance_log", "Maintenance Log"
        MODEL_EXPLANATION = "model_explanation", "Model Explanation"
        SAFETY_CODE = "safety_code", "Safety Code"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=500)
    doc_type = models.CharField(max_length=20, choices=DocType.choices)
    asset_scope = models.JSONField(default=list)  # ["SRF", "HHPD"]
    chroma_collection = models.CharField(max_length=100)
    chroma_object_ids = models.JSONField(default=list)
    source_url = models.URLField(max_length=1000, blank=True)
    version = models.CharField(max_length=50, blank=True)
    indexed_at = models.DateTimeField(null=True, blank=True)
    is_ingested = models.BooleanField(default=False)

    class Meta:
        db_table = "rag_document"

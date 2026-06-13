import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Document",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=500)),
                ("doc_type", models.CharField(choices=[("manual", "Equipment Manual"), ("sop", "SOP"), ("iso_standard", "ISO Standard"), ("maintenance_log", "Maintenance Log"), ("model_explanation", "Model Explanation"), ("safety_code", "Safety Code")], max_length=20)),
                ("asset_scope", models.JSONField(default=list)),
                ("chroma_collection", models.CharField(max_length=100)),
                ("chroma_object_ids", models.JSONField(default=list)),
                ("source_url", models.URLField(blank=True, max_length=1000)),
                ("version", models.CharField(blank=True, max_length=50)),
                ("indexed_at", models.DateTimeField(blank=True, null=True)),
                ("is_ingested", models.BooleanField(default=False)),
            ],
            options={"db_table": "rag_document"},
        ),
    ]

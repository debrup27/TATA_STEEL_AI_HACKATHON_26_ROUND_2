import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("reports", "0001_initial"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Feedback",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("feedback_type", models.CharField(choices=[("confirm", "Confirm"), ("correct", "Correct"), ("reject", "Reject")], max_length=10)),
                ("corrected_values", models.JSONField(blank=True, default=dict)),
                ("chroma_updated", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("report", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="feedbacks", to="reports.maintenancereport")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="feedbacks", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "feedback_feedback"},
        ),
    ]

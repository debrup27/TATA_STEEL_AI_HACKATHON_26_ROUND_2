import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("asset_id", models.UUIDField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_active", models.DateTimeField(auto_now=True)),
                ("session_metadata", models.JSONField(blank=True, default=dict)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_sessions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "agents_chat_session", "ordering": ["-last_active"]},
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("role", models.CharField(choices=[("user", "User"), ("assistant", "Assistant"), ("system", "System")], max_length=10)),
                ("content", models.TextField()),
                ("citations", models.JSONField(default=list)),
                ("shap_context", models.JSONField(blank=True, null=True)),
                ("model_used", models.CharField(blank=True, max_length=100)),
                ("token_usage", models.JSONField(blank=True, default=dict)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("session", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="agents.chatsession")),
            ],
            options={"db_table": "agents_chat_message", "ordering": ["timestamp"]},
        ),
    ]

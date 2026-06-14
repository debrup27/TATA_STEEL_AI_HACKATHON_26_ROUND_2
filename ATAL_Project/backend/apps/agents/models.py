import uuid
from django.db import models
from apps.users.models import User


class AgentAuditLog(models.Model):
    """
    Immutable audit trail for every tool dispatch attempt (REQ-SECURITY-003).
    Written by dispatch_tool() in apps/agents/graph/tools.py.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tool_name = models.CharField(max_length=100)
    asset_id = models.UUIDField(null=True, blank=True)
    args = models.JSONField(default=dict)
    result_summary = models.TextField(blank=True)
    rejected = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "agents_audit_log"
        ordering = ["-timestamp"]

    def __str__(self):
        status = "REJECTED" if self.rejected else "OK"
        return f"[{status}] {self.tool_name} @ {self.timestamp:%Y-%m-%d %H:%M:%S}"


class ChatSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_sessions")
    asset_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    session_metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "agents_chat_session"
        ordering = ["-last_active"]


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    citations = models.JSONField(default=list)
    shap_context = models.JSONField(null=True, blank=True)
    model_used = models.CharField(max_length=100, blank=True)
    token_usage = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "agents_chat_message"
        ordering = ["timestamp"]

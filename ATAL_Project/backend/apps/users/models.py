import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    timezone = models.CharField(max_length=64, default="UTC")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    class Role(models.TextChoices):
        TECHNICIAN = "technician", "Technician"
        SUPERVISOR = "supervisor", "Supervisor"
        ADMIN = "admin", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    org = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="users"
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TECHNICIAN)
    factory_access = models.JSONField(default=list, blank=True)
    notification_prefs = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "users_user"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="audit_logs"
    )
    action = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    request_ip = models.GenericIPAddressField(null=True, blank=True)
    payload_hash = models.CharField(max_length=64, blank=True)
    outcome = models.CharField(max_length=50, default="success")

    class Meta:
        db_table = "users_audit_log"
        indexes = [
            models.Index(fields=["resource_type", "resource_id"]),
            models.Index(fields=["user", "timestamp"]),
        ]

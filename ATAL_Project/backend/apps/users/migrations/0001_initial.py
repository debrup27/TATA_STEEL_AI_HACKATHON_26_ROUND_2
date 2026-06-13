import uuid
import django.contrib.auth.models
import django.contrib.auth.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="Organization",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255)),
                ("slug", models.SlugField(unique=True)),
                ("timezone", models.CharField(default="UTC", max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "users_organization"},
        ),
        migrations.CreateModel(
            name="User",
            fields=[
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False)),
                ("username", models.CharField(error_messages={"unique": "A user with that username already exists."}, max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()])),
                ("first_name", models.CharField(blank=True, max_length=150)),
                ("last_name", models.CharField(blank=True, max_length=150)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("is_staff", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("date_joined", models.DateTimeField(default=django.utils.timezone.now)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("role", models.CharField(choices=[("technician", "Technician"), ("supervisor", "Supervisor"), ("admin", "Admin")], default="technician", max_length=20)),
                ("factory_access", models.JSONField(blank=True, default=list)),
                ("notification_prefs", models.JSONField(blank=True, default=dict)),
                ("groups", models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.group", verbose_name="groups")),
                ("user_permissions", models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.permission", verbose_name="user permissions")),
                ("org", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="users", to="users.organization")),
            ],
            options={"db_table": "users_user"},
            managers=[("objects", django.contrib.auth.models.UserManager())],
        ),
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(max_length=255)),
                ("resource_type", models.CharField(max_length=100)),
                ("resource_id", models.CharField(blank=True, max_length=255)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("request_ip", models.GenericIPAddressField(blank=True, null=True)),
                ("payload_hash", models.CharField(blank=True, max_length=64)),
                ("outcome", models.CharField(default="success", max_length=50)),
                ("user", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "users_audit_log"},
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["resource_type", "resource_id"], name="audit_resource_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["user", "timestamp"], name="audit_user_ts_idx"),
        ),
    ]

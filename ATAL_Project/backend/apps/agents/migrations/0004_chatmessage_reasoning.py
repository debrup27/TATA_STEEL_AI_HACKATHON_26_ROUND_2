from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("agents", "0003_agent_audit_log"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatmessage",
            name="reasoning",
            field=models.TextField(blank=True, default=""),
        ),
    ]

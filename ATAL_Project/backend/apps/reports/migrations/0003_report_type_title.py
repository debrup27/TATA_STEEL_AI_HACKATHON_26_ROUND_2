from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="maintenancereport",
            name="report_type",
            field=models.CharField(
                choices=[
                    ("maintenance", "Maintenance Report"),
                    ("abnormal_alert", "Abnormal Alert"),
                    ("decision_summary", "Decision Summary"),
                    ("digital_log", "Digital Log"),
                ],
                default="maintenance",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="maintenancereport",
            name="title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]

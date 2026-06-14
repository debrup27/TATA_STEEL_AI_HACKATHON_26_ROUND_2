from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ml", "0003_mlprediction_model_nullable"),
    ]

    operations = [
        migrations.AlterField(
            model_name="mlprediction",
            name="celery_task_id",
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
    ]

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ml", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="mlprediction",
            name="model",
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="predictions",
                to="ml.mlmodel",
            ),
        ),
    ]

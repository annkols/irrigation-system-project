# Generated manually for per-sensor reading frequency configuration.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('experiments', '0002_experiment_is_public_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='experiment',
            name='sensor_frequencies',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]

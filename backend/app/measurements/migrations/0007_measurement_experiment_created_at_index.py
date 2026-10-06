from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('measurements', '0006_backfill_measurement_experiment'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='measurement',
            index=models.Index(
                fields=['experiment', '-created_at'],
                name='meas_exp_created_idx',
            ),
        ),
    ]

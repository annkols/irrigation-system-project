# Generated manually to support per-sensor measurement intervals.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('measurements', '0003_remove_measurement_measurement_experim_9b5d9c_idx_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='measurement',
            name='moisture_percent',
            field=models.FloatField(blank=True, null=True),
        ),
    ]

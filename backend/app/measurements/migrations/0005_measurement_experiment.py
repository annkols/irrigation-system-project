import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('experiments', '0008_alter_experiment_owner'),
        ('measurements', '0004_alter_measurement_moisture_percent'),
    ]

    operations = [
        migrations.AddField(
            model_name='measurement',
            name='experiment',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='measurements',
                to='experiments.experiment',
            ),
        ),
    ]

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('experiments', '0003_experiment_sensor_frequencies'),
    ]

    operations = [
        migrations.AddField(
            model_name='experiment',
            name='table_count',
            field=models.PositiveIntegerField(
                default=1,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(20),
                ],
            ),
        ),
        migrations.AddField(
            model_name='experiment',
            name='pots_per_table',
            field=models.PositiveIntegerField(
                default=1,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(40),
                ],
            ),
        ),
    ]

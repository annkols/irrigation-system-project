from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('experiments', '0005_rename_sensor_set_id_experiment_sensor_package_variant'),
    ]

    operations = [
        migrations.AlterField(
            model_name='experiment',
            name='sensor_package_variant',
            field=models.PositiveSmallIntegerField(choices=[(1, 'sensor package 1'), (2, 'sensor package 2'), (3, 'sensor package 3')]),
        ),
    ]

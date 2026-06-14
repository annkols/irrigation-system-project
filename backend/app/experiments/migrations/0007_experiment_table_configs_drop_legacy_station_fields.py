from django.db import migrations, models

import experiments.models


class Migration(migrations.Migration):

    dependencies = [
        ('experiments', '0006_alter_experiment_sensor_package_variant'),
    ]

    operations = [
        migrations.AddField(
            model_name='experiment',
            name='table_configs',
            field=models.JSONField(
                blank=True,
                default=experiments.models.default_table_configs
            ),
        ),
        migrations.RunSQL(
            sql="""
                ALTER TABLE experiments_experiment
                DROP COLUMN IF EXISTS station_number;
                ALTER TABLE experiments_experiment
                DROP COLUMN IF EXISTS station_numbers;
                ALTER TABLE experiments_experiment
                DROP COLUMN IF EXISTS station_configs;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

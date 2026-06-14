from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiments', '0004_experiment_table_count_experiment_pots_per_table'),
    ]

    operations = [
        migrations.RenameField(
            model_name='experiment',
            old_name='sensor_set_id',
            new_name='sensor_package_variant',
        ),
    ]

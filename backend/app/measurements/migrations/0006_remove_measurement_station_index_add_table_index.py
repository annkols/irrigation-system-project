from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('measurements', '0005_rename_station_number_measurement_table_number'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='measurement',
            name='measurement_station_224b14_idx',
        ),
        migrations.AddIndex(
            model_name='measurement',
            index=models.Index(
                fields=['table_number', 'pot_number', 'created_at'],
                name='measurement_table_n_195e1c_idx',
            ),
        ),
    ]

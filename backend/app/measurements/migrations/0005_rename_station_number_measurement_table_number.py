from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('measurements', '0004_alter_measurement_moisture_percent'),
    ]

    operations = [
        migrations.RenameField(
            model_name='measurement',
            old_name='station_number',
            new_name='table_number',
        ),
    ]

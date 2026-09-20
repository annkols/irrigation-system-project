from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pump_control', '0002_pumpcommand_pot_number_pumpcommand_station_number_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='pumpcommand',
            name='duration_seconds',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]

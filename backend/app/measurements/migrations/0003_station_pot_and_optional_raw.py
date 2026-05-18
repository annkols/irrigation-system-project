from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('measurements', '0002_full_sensor_readings'),
    ]

    operations = [
        migrations.AlterField(
            model_name='measurement',
            name='device_name',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AlterField(
            model_name='measurement',
            name='raw_value',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='measurement',
            name='station_number',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='measurement',
            name='pot_number',
            field=models.PositiveIntegerField(default=1),
        ),
    ]

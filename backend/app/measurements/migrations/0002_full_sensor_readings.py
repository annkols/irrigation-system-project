from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('measurements', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='measurement',
            name='air_temperature',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='measurement',
            name='air_humidity',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='measurement',
            name='pressure_hpa',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='measurement',
            name='soil_temperature',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='measurement',
            name='light_lux',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='measurement',
            name='pump_on',
            field=models.BooleanField(default=False),
        ),
    ]

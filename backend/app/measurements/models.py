from django.db import models
from sensors.models import Sensor


class Measurement(models.Model):
    sensor = models.ForeignKey(
        Sensor,
        on_delete=models.PROTECT,
        related_name="measurements",
        null=True,
        blank=True,
    )
    station_number = models.PositiveIntegerField(default=1)
    pot_number = models.PositiveIntegerField(default=1)
    raw_value = models.IntegerField(null=True, blank=True)
    moisture_percent = models.FloatField()
    air_temperature = models.FloatField(null=True, blank=True)
    air_humidity = models.FloatField(null=True, blank=True)
    pressure_hpa = models.FloatField(null=True, blank=True)
    soil_temperature = models.FloatField(null=True, blank=True)
    light_lux = models.FloatField(null=True, blank=True)
    pump_on = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"station {self.station_number} | pot {self.pot_number} | {self.moisture_percent}%"

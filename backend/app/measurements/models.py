from django.db import models


class Measurement(models.Model):
    sensor = models.ForeignKey(
        'sensors.Sensor',
        on_delete=models.PROTECT,
        related_name='measurements',
        null=True,
        blank=True
    )

    raw_value = models.IntegerField()
    moisture_percent = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        sensor_name = self.sensor.name if self.sensor else "No sensor"
        return f"{sensor_name} | {self.raw_value} | {self.moisture_percent}%"
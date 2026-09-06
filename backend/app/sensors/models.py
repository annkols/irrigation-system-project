from django.db import models

"""
{
  "id": 1,
  "code": "sensor_1",
  "name": "Soil moisture sensor",
  "sensor_set_id": 1,
  "sensor_type": "soil_moisture",
  "unit": "%"
}
"""

# Create your models here.
class Sensor(models.Model):
    class SensorType(models.TextChoices):
        SOIL_MOISTURE = "moisture_content", "Moisture content"
        OUT_TEMPERATURE = "out_temperature", "Outdoor temperature"
        IN_TEMPERATURE = "in_temperature", "Indoor temperature"
        AIR_HUMIDITY = "air_humidity", "Air humidity"
        LIGHT_INTENSITY = "light_intensity", "Light intensity"

    # do identyfikacji z arduino
    code = models.CharField(max_length=50, unique=True)

    name = models.CharField(max_length=100)

    sensor_set_id = models.PositiveSmallIntegerField()

    sensor_type = models.CharField(max_length=30, choices=SensorType.choices, default=SensorType.SOIL_MOISTURE)

    unit = models.CharField(max_length=20, default="")

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} | {self.code} | set {self.sensor_set_id}"

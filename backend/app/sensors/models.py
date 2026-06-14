from django.db import models

"""
{
  "id": 1,
  "code": "sensor_1",
  "name": "Soil moisture sensor",
  "sensor_package_variant": 1,
  "sensor_type": "soil_moisture",
  "unit": "%"
}
"""

# Create your models here.
class Sensor(models.Model):
    class SensorPackage(models.IntegerChoices):
        SET_1 = 1, "sensor package 1"
        SET_2 = 2, "sensor package 2"
        SET_3 = 3, "sensor package 3"

    class SensorType(models.TextChoices):
        SOIL_MOISTURE = "moisture_content", "Moisture content"
        OUT_TEMPERATURE = "out_temperature", "Outdoor temperature"
        IN_TEMPERATURE = "in_temperature", "Indoor temperature"
        AIR_HUMIDITY = "air_humidity", "Air humidity"
        LIGHT_INTENSITY = "light_intensity", "Light intensity"

    # do identyfikacji z arduino
    code = models.CharField(max_length=50, unique=True)

    name = models.CharField(max_length=100)

    sensor_package_variant = models.PositiveSmallIntegerField()

    sensor_type = models.CharField(max_length=30, choices=SensorType.choices, default=SensorType.SOIL_MOISTURE)

    unit = models.CharField(max_length=20, default="")

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} | {self.code} | set {self.sensor_package_variant}"


class SensorDevice(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100, blank=True)
    max_sensor_package_variant = models.PositiveSmallIntegerField(default=3)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return self.code


class SensorDeviceAssignment(models.Model):
    experiment = models.ForeignKey(
        'experiments.Experiment',
        on_delete=models.CASCADE,
        related_name='device_assignments'
    )
    device = models.ForeignKey(
        SensorDevice,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    table_number = models.PositiveIntegerField()
    pot_number = models.PositiveIntegerField()
    assigned_from = models.DateTimeField()
    assigned_to = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['table_number', 'pot_number']
        indexes = [
            models.Index(fields=['device', 'assigned_from', 'assigned_to']),
            models.Index(fields=['experiment', 'table_number', 'pot_number']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['experiment', 'table_number', 'pot_number'],
                name='unique_device_assignment_per_experiment_pot'
            )
        ]

    def __str__(self):
        return f"{self.device.code} -> experiment {self.experiment_id}, table {self.table_number}, pot {self.pot_number}"

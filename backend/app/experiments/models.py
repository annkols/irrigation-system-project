from django.db import models

# Create your models here.
class Experiment(models.Model):
    class SensorSet(models.IntegerChoices):
        SET_1 = 1, "Sensor set 1"
        SET_2 = 2, "Sensor set 2"
        SET_3 = 3, "Sensor set 3"

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    plant_name = models.CharField(max_length=100, blank=True)

    sensor_set_id = models.PositiveSmallIntegerField(
        choices=SensorSet.choices
    )

    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} | {self.plant_name} | {self.sensor_set_id}"
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator

# Create your models here.
class Experiment(models.Model):
    class SensorSet(models.IntegerChoices):
        SET_1 = 1, "Sensor set 1"
        SET_2 = 2, "Sensor set 2"
        SET_3 = 3, "Sensor set 3"

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    plant_name = models.CharField(max_length=100, blank=True)

    # FK do userów eksperyment ---> 1 user (owner)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_experiments",
        null=True,
        blank=True
    )

    # FK do userów eksperyment ---> wielu userów (collab)
    collaborators = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="collaborated_experiments",
        blank=True
    )

    sensor_set_id = models.PositiveSmallIntegerField(
        choices=SensorSet.choices
    )

    started_at = models.DateTimeField(null=True, blank=True)
    planned_end_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    sensor_frequencies = models.JSONField(default=dict, blank=True)
    
    is_public = models.BooleanField(default=False)

    @property
    def status(self):
        now = timezone.now()

        if self.finished_at is not None:
            return "completed"

        if self.started_at is not None and self.started_at < now:
            return "in progress"

        return "not started"

    def __str__(self):
        return f"{self.name} | {self.plant_name} | {self.owner} | {self.sensor_set_id} | {self.status}"

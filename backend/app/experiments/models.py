from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MaxValueValidator, MinValueValidator


def default_table_configs():
    return [{"table_number": 1, "pot_count": 1}]


# Create your models here.
class Experiment(models.Model):
    class SensorPackage(models.IntegerChoices):
        SET_1 = 1, "sensor package 1"
        SET_2 = 2, "sensor package 2"
        SET_3 = 3, "sensor package 3"

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

    sensor_package_variant = models.PositiveSmallIntegerField(
        choices=SensorPackage.choices
    )
    table_count = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(20)]
    )
    pots_per_table = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(40)]
    )
    table_configs = models.JSONField(default=default_table_configs, blank=True)

    started_at = models.DateTimeField(null=True, blank=True)
    planned_end_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    measurement_frequency_seconds = models.PositiveIntegerField(
        default=900, #15 min
        validators=[MinValueValidator(1)]
    )

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
        return f"{self.name} | {self.plant_name} | {self.owner} | {self.sensor_package_variant} | {self.status}"

    def normalized_table_configs(self):
        if isinstance(self.table_configs, list) and self.table_configs:
            return self.table_configs

        return [
            {"table_number": table_number, "pot_count": self.pots_per_table}
            for table_number in range(1, self.table_count + 1)
        ]

    def max_pot_count(self):
        return max(
            (config.get("pot_count", 1) for config in self.normalized_table_configs()),
            default=1
        )


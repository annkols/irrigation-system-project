from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator

class Keyword(models.Model):
    name = models.CharField(max_length=50, unique=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

# MODEL COLLABORATORA
class ExperimentCollaborator(models.Model):
    experiment = models.ForeignKey(
        "Experiment",
        on_delete=models.CASCADE,
        related_name="collaborator_memberships",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="experiment_memberships",
    )

    can_edit_experiment = models.BooleanField(default=False)
    can_end_experiment = models.BooleanField(default=False)

    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["experiment", "user"],
                name="unique_experiment_collaborator",
            )
        ]


class Experiment(models.Model):
    class SensorSet(models.IntegerChoices):
        SET_1 = 1, "Sensor set 1"
        SET_2 = 2, "Sensor set 2"
        SET_3 = 3, "Sensor set 3"

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    plant_name = models.CharField(max_length=100, blank=True)
    keywords = models.ManyToManyField(
        Keyword,
        related_name="experiments",
        blank=True,
    )

    # FK do userów eksperyment ---> 1 user (owner)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="owned_experiments",
        null=True,
        blank=True
    )

    # FK do userów eksperyment ---> wielu userów (collab)
    collaborators = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="ExperimentCollaborator",
        related_name="collaborated_experiments",
        blank=True,
    )

    sensor_set_id = models.PositiveSmallIntegerField(
        choices=SensorSet.choices
    )

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
        return f"{self.name} | {self.plant_name} | {self.owner} | {self.sensor_set_id} | {self.status}"

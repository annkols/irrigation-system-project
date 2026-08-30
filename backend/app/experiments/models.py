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


class Experiment(models.Model):
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

    # Numer fizycznego zestawu. Nie opisuje już wariantu BASIC/EXTENDED/FULL.
    # Pole pozostaje dla zgodności z działającym oprogramowaniem urządzeń.
    sensor_set_id = models.PositiveSmallIntegerField()

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


class ExperimentalFactor(models.Model):
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name="factors",
    )
    name = models.CharField(max_length=100)
    unit = models.CharField(max_length=30, blank=True)
    position = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["experiment", "name"],
                name="unique_factor_name_per_experiment",
            )
        ]

    def __str__(self):
        return f"{self.experiment.name}: {self.name}"


class FactorLevel(models.Model):
    factor = models.ForeignKey(
        ExperimentalFactor,
        on_delete=models.CASCADE,
        related_name="levels",
    )
    label = models.CharField(max_length=100)
    value = models.CharField(max_length=100, blank=True)
    is_reference = models.BooleanField(default=False)
    position = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["factor", "label"],
                name="unique_level_label_per_factor",
            )
        ]

    def __str__(self):
        return f"{self.factor.name}: {self.label}"


class Treatment(models.Model):
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name="treatments",
    )
    name = models.CharField(max_length=255)
    position = models.PositiveIntegerField(default=1)
    levels = models.ManyToManyField(
        FactorLevel,
        through="TreatmentFactorLevel",
        related_name="treatments",
    )

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["experiment", "name"],
                name="unique_treatment_name_per_experiment",
            )
        ]

    def __str__(self):
        return self.name


class TreatmentFactorLevel(models.Model):
    treatment = models.ForeignKey(Treatment, on_delete=models.CASCADE)
    factor = models.ForeignKey(ExperimentalFactor, on_delete=models.CASCADE)
    level = models.ForeignKey(FactorLevel, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["treatment", "factor"],
                name="one_level_per_factor_in_treatment",
            )
        ]


class Pot(models.Model):
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name="pots",
    )
    treatment = models.ForeignKey(
        Treatment,
        on_delete=models.CASCADE,
        related_name="pots",
    )
    label = models.CharField(max_length=30)
    replicate_number = models.PositiveSmallIntegerField()
    position = models.PositiveIntegerField()
    is_monitored = models.BooleanField(default=False)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["experiment", "label"],
                name="unique_pot_label_per_experiment",
            ),
            models.UniqueConstraint(
                fields=["treatment", "replicate_number"],
                name="unique_treatment_replicate",
            ),
        ]

    def __str__(self):
        return f"{self.label} - {self.treatment.name}"


class PotHardwareAssignment(models.Model):
    class ComponentType(models.TextChoices):
        SOIL_MOISTURE = "soil_moisture", "Soil moisture sensor"
        SOIL_TEMPERATURE = "soil_temperature", "Soil temperature sensor"
        PUMP = "pump", "Pump"

    pot = models.ForeignKey(
        Pot,
        on_delete=models.CASCADE,
        related_name="hardware_assignments",
    )
    component_type = models.CharField(max_length=30, choices=ComponentType.choices)
    component_identifier = models.CharField(max_length=100)

    class Meta:
        ordering = ["component_type", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["pot", "component_type"],
                name="one_component_type_per_pot",
            ),
        ]

    def __str__(self):
        return f"{self.pot.label}: {self.component_identifier}"


class ExperimentCameraAssignment(models.Model):
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name="camera_assignments",
    )
    pot = models.ForeignKey(
        Pot,
        on_delete=models.CASCADE,
        related_name="camera_assignments",
    )
    camera = models.ForeignKey(
        "camera_frames.CameraDevice",
        on_delete=models.PROTECT,
        related_name="experiment_assignments",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["experiment", "camera"],
                name="camera_once_per_experiment",
            )
        ]

    def __str__(self):
        return f"{self.camera.name}: {self.pot.label}"

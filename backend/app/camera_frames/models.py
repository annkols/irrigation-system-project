from django.conf import settings
from django.db import models

from experiments.models import Experiment


class CameraFrame(models.Model):
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name="camera_frames",
    )
    image = models.ImageField(upload_to="camera_frames/%Y/%m/%d/")
    captured_at = models.DateTimeField(auto_now_add=True)
    captured_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="captured_camera_frames",
    )
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-captured_at"]

    def delete(self, *args, **kwargs):
        image = self.image
        super().delete(*args, **kwargs)
        if image:
            image.delete(save=False)

    def __str__(self):
        return f"Frame {self.pk} - {self.experiment.name}"

import hashlib
import secrets
from hmac import compare_digest

from django.conf import settings
from django.db import models

from experiments.models import Experiment

class CameraDevice(models.Model):
    name = models.CharField(max_length=100)
    sensor_set_id = models.PositiveSmallIntegerField(
        db_index=True,
    )
    token_hash = models.CharField(max_length=64, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def hash_token(token):
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def generate_token(self, save=True):
        token = secrets.token_urlsafe(32)
        self.token_hash = self.hash_token(token)
        if save:
            self.save(update_fields=["token_hash"])
        return token

    def token_matches(self, token):
        if not token or not self.token_hash:
            return False
        return compare_digest(self.token_hash, self.hash_token(token))

    def __str__(self):
        return f"{self.name} - sensor set {self.sensor_set_id}"


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

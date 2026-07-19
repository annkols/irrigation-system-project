# users/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)


class CustomUserProfile(models.Model):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        PROFESSOR = "professor", "Professor"
        ADMINISTRATIVE_WORKER = "administrative_worker", "Administrative worker"
        OTHER = "other", "Other"

    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    university = models.CharField(max_length=150)

    department = models.CharField(max_length=150)

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.OTHER,
    )

    profile_picture = models.ImageField(
        upload_to="profile_pictures/",
        blank=True,
    )

    def __str__(self):
        return (
            f"{self.user.first_name} {self.user.last_name}"
            f" | {self.department}"
        )
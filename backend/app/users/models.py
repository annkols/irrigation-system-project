# users/models.py

from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        DOCTORAL_STUDENT = "doctoral_student", "Doctoral student"
        ACADEMIC_EMPLOYEE = "academic_employee", "Academic employee"
        ADMINISTRATIVE_WORKER = "administrative_worker", "Administrative worker"
        OTHER = "other", "Other"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    university = models.CharField(max_length=150, blank=True)

    department = models.CharField(max_length=150, blank=True)

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

class DismissedNotification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dismissed_notifications"
    )
    notification_id = models.CharField(max_length=100)
    dismissed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "notification_id"],
                name="unique_user_dismissed_notification"
            )
        ]

    def __str__(self):
        return f"{self.user.username} dismissed {self.notification_id}"
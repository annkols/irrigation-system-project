from django.db import models
from django.conf import settings

"""
{
  "id": 1,
}
"""

# Create your models here.
class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )

    scientific_unit = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name} | {self.scientific_unit}"
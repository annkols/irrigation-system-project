from django.db import models


class PumpCommand(models.Model):
    class Command(models.TextChoices):
        ON = 'ON', 'On'
        OFF = 'OFF', 'Off'
        AUTO = 'AUTO', 'Auto'

    command = models.CharField(max_length=10, choices=Command.choices)
    station_number = models.PositiveIntegerField(default=1)
    pot_number = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['station_number', 'pot_number', 'created_at']),
        ]

    def __str__(self):
        return f"Set {self.station_number}, pot {self.pot_number}: {self.command}"

from django.db import models


class PumpCommand(models.Model):
    class Command(models.TextChoices):
        ON = 'ON', 'On'
        OFF = 'OFF', 'Off'
        AUTO = 'AUTO', 'Auto'

    command = models.CharField(max_length=10, choices=Command.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f"Pump command: {self.command}"

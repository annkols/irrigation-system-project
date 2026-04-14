from django.db import models


class Measurement(models.Model):
    device_name = models.CharField(max_length=100)
    raw_value = models.IntegerField()
    moisture_percent = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.device_name} | {self.raw_value} | {self.moisture_percent}%"
from django.db import models


class Measurement(models.Model):
    # identyfikatory do powiązania z eksperymentem
    table_number = models.PositiveIntegerField(default=1)
    pot_number = models.PositiveIntegerField(default=1)

    # pomiary z arduino
    raw_value = models.IntegerField(null=True, blank=True)
    moisture_percent = models.FloatField(null=True, blank=True)
    air_temperature = models.FloatField(null=True, blank=True)
    air_humidity = models.FloatField(null=True, blank=True)
    pressure_hpa = models.FloatField(null=True, blank=True)
    soil_temperature = models.FloatField(null=True, blank=True)
    light_lux = models.FloatField(null=True, blank=True)
    pump_on = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:

        # default sortowanie
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['table_number', 'pot_number', 'created_at']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"table {self.table_number} | pot {self.pot_number} | {self.moisture_percent}%"
    


from rest_framework import serializers
from .models import Measurement


class MeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measurement
        fields = [
            'id',
            'station_number',
            'pot_number',
            'moisture_percent',
            'air_temperature',
            'air_humidity',
            'pressure_hpa',
            'soil_temperature',
            'light_lux',
            'pump_on',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_moisture_percent(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("moisture_percent musi być w zakresie 0-100.")
        return value


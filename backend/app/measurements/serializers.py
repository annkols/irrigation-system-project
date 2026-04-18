from rest_framework import serializers
from .models import Measurement


class MeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Measurement
        fields = ['id', 'device_name', 'raw_value', 'moisture_percent', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_moisture_percent(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("moisture_percent musi być w zakresie 0-100.")
        return value

    def validate_raw_value(self, value):
        if value < 0:
            raise serializers.ValidationError("raw_value nie może być ujemne.")
        return value
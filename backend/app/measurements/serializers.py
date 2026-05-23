from rest_framework import serializers
from .models import Measurement
from sensors.models import Sensor


class MeasurementSerializer(serializers.ModelSerializer):
    sensor_id = serializers.PrimaryKeyRelatedField(
        queryset=Sensor.objects.all(),
        source='sensor',
        required=False,
        allow_null=True
    )

    sensor_name = serializers.CharField(
        source='sensor.name',
        read_only=True
    )

    sensor_code = serializers.CharField(
        source='sensor.code',
        read_only=True
    )

    class Meta:
        model = Measurement
        fields = [
            'id',
            'sensor_id',
            'sensor_name',
            'sensor_code',
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


from rest_framework import serializers
from experiments.models import Experiment
from .models import Measurement


class MeasurementSerializer(serializers.ModelSerializer):
    experiment_id = serializers.PrimaryKeyRelatedField(
        source='experiment',
        queryset=Experiment.objects.all(),
        required=True,
        allow_null=False,
    )

    class Meta:
        model = Measurement
        fields = [
            'id',
            'experiment_id',
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

    def validate(self, attrs):
        experiment = attrs.get('experiment', getattr(self.instance, 'experiment', None))
        station_number = attrs.get(
            'station_number',
            getattr(self.instance, 'station_number', None),
        )
        if experiment and station_number != experiment.sensor_set_id:
            raise serializers.ValidationError({
                'experiment_id': 'Eksperyment należy do innego zestawu czujników.'
            })
        return attrs

    def validate_moisture_percent(self, value):
        if value is None:
            return value

        if value < 0 or value > 100:
            raise serializers.ValidationError("moisture_percent musi być w zakresie 0-100.")
        return value

    def validate_air_humidity(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("air_humidity musi być w zakresie 0-100.")
        return value

    def validate_light_lux(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("light_lux nie może być wartością ujemną.")
        return value

    def validate_pressure_hpa(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("pressure_hpa musi być wartością dodatnią.")
        return value

from rest_framework import serializers

from measurements.models import Measurement
from measurements.serializers import MeasurementSerializer
from .models import Experiment


ALLOWED_SENSOR_FREQUENCY_KEYS = {
    'soil_moisture',
    'light',
    'soil_temperature',
    'air_temperature',
    'air_humidity',
    'pressure',
}

# CREATE/READ EXPERIMENT
class ExperimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experiment
        fields = [
            'id',
            'name',
            'description',
            'plant_name',
            'owner',
            'collaborators',
            'sensor_set_id',
            'measurement_frequency_seconds',
            'sensor_frequencies',
            'created_at',
            'started_at',
            'planned_end_at',
            'finished_at',
            'status',
            'is_public'
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def validate(self, data):
        instance = getattr(self, 'instance', None)

        owner = data.get('owner', getattr(instance, 'owner', None))

        if 'collaborators' in data:
            collaborators = data.get('collaborators', [])
        elif instance:
            collaborators = list(instance.collaborators.all())
        else:
            collaborators = []

        if owner and owner in collaborators:
            raise serializers.ValidationError({
                "collaborators": "Właściciel eksperymentu nie może zostać dodany jako uczestnik."
            })

        name = data.get('name')
        if name is not None and not name.strip():
            raise serializers.ValidationError({
                "name": "Nazwa eksperymentu nie może być pusta."
            })

        plant_name = data.get('plant_name')
        if plant_name is not None and not plant_name.strip():
            raise serializers.ValidationError({
                "plant_name": "Nazwa rośliny nie może być pusta."
            })

        sensor_set_id = data.get(
            'sensor_set_id',
            getattr(instance, 'sensor_set_id', None)
        )

        if sensor_set_id is not None and sensor_set_id < 1:
            raise serializers.ValidationError({
                "sensor_set_id": "Id zestawu czujników musi być większe od 0."
            })
        
        measurement_frequency_seconds = data.get(
            'measurement_frequency_seconds',
            getattr(instance, 'measurement_frequency_seconds', None)
        )

        if measurement_frequency_seconds is not None and measurement_frequency_seconds < 1:
            raise serializers.ValidationError({
                "measurement_frequency_seconds": "Częstotliwość pomiaru musi być większa od 0 sekund i nie może być pusta."
            })

        sensor_frequencies = data.get(
            'sensor_frequencies',
            getattr(instance, 'sensor_frequencies', None)
        )

        if sensor_frequencies:
            if not isinstance(sensor_frequencies, dict):
                raise serializers.ValidationError({
                    "sensor_frequencies": "Czestotliwosci czujnikow musza byc obiektem."
                })

            invalid_keys = set(sensor_frequencies.keys()) - ALLOWED_SENSOR_FREQUENCY_KEYS
            if invalid_keys:
                raise serializers.ValidationError({
                    "sensor_frequencies": f"Nieznane czujniki: {', '.join(sorted(invalid_keys))}."
                })

            for sensor, frequency in sensor_frequencies.items():
                if not isinstance(frequency, int) or frequency < 1:
                    raise serializers.ValidationError({
                        "sensor_frequencies": f"Czestotliwosc dla {sensor} musi byc liczba calkowita wieksza od 0."
                    })

        started_at = data.get(
            'started_at',
            getattr(instance, 'started_at', None)
        )

        finished_at = data.get(
            'finished_at',
            getattr(instance, 'finished_at', None)
        )

        planned_end_at = data.get(
            'planned_end_at',
            getattr(instance, 'planned_end_at', None)
        )

        if finished_at and not started_at:
            raise serializers.ValidationError({
                "finished_at": "Nie można zakończyć eksperymentu, który nie ma daty rozpoczęcia."
            })
                
        if planned_end_at and not started_at:
            raise serializers.ValidationError({
                "planned_end_at": "Nie można ustawić planowanej daty zakończenia bez daty rozpoczęcia."
            })

        if started_at and finished_at and finished_at < started_at:
            raise serializers.ValidationError({
                "finished_at": "Data zakończenia eksperymentu musi być nie wcześniejsza niż data rozpoczęcia eksperymentu."
            })

        if sensor_set_id and not finished_at:
            active_experiments = Experiment.objects.filter(
                sensor_set_id=sensor_set_id,
                finished_at__isnull=True
            )

            if instance:
                active_experiments = active_experiments.exclude(pk=instance.pk)

            if active_experiments.exists():
                raise serializers.ValidationError({
                    "sensor_set_id": "Istnieje już niezakończony eksperyment dla tego zestawu czujników."
                })

        return data

# UPDATE EXPERIMENT
class ExperimentUpdateSerializer(ExperimentSerializer):
    NONCHANGEABLE_FIELDS = {
        "sensor_set_id",
        "owner",
        "created_at",
        'finished_at',
    }

    class Meta(ExperimentSerializer.Meta):
        read_only_fields = ExperimentSerializer.Meta.read_only_fields + [
            "sensor_set_id",
            "owner",
            "created_at",
            'finished_at'
        ]

    def validate(self, data):
        forbidden_fields = self.NONCHANGEABLE_FIELDS.intersection(self.initial_data.keys())
        

        if forbidden_fields:
            errors = {}

            if "sensor_set_id" in forbidden_fields:
                errors["sensor_set_id"] = "Nie można edytować zestawu sensorów."

            if "owner" in forbidden_fields:
                errors["owner"] = "Nie można zmienić właściciela eksperymentu."

            if "created_at" in forbidden_fields:
                errors["created_at"] = "Nie można edytować daty stworzenia eksperymentu."

            if "finished_at" in forbidden_fields:
                errors["finished_at"] = "Nie można edytować daty zakończenia eksperymentu."

            raise serializers.ValidationError(errors)

        return super().validate(data)

# READ WITH MEASUREMENTS
class ExperimentWithMeasurementsSerializer(ExperimentSerializer):
    measurements = serializers.SerializerMethodField()

    class Meta(ExperimentSerializer.Meta):
        fields = ExperimentSerializer.Meta.fields + ['measurements']

    def get_measurements(self, obj):
        measurements = Measurement.objects.filter(
            station_number=obj.sensor_set_id
        ).order_by('-created_at')

        if obj.started_at:
            measurements = measurements.filter(created_at__gte=obj.started_at)

        if obj.finished_at:
            measurements = measurements.filter(created_at__lte=obj.finished_at)

        return MeasurementSerializer(measurements, many=True).data

from rest_framework import serializers
from django.db.models import Q

from measurements.models import Measurement
from measurements.serializers import MeasurementSerializer
from sensors.models import SensorDevice, SensorDeviceAssignment
from sensors.serializers import SensorDeviceAssignmentSerializer
from .models import Experiment


ALLOWED_SENSOR_FREQUENCY_KEYS = {
    'soil_moisture',
    'light',
    'soil_temperature',
    'air_temperature',
    'air_humidity',
    'pressure',
}

MAX_TABLES_PER_EXPERIMENT = 20
MAX_POTS_PER_TABLE = 40


def normalize_table_configs(table_configs, table_count=None, pots_per_table=None):
    if table_configs in (None, ""):
        table_count = table_count or 1
        pots_per_table = pots_per_table or 1
        return [
            {"table_number": table_number, "pot_count": pots_per_table}
            for table_number in range(1, table_count + 1)
        ]

    if not isinstance(table_configs, list) or not table_configs:
        raise serializers.ValidationError({
            "table_configs": "Table configuration must contain at least one table."
        })

    if len(table_configs) > MAX_TABLES_PER_EXPERIMENT:
        raise serializers.ValidationError({
            "table_configs": f"Number of tables must be from 1 to {MAX_TABLES_PER_EXPERIMENT}."
        })

    normalized_configs = []
    seen_table_numbers = set()

    for index, config in enumerate(table_configs, start=1):
        if not isinstance(config, dict):
            raise serializers.ValidationError({
                "table_configs": "Each table configuration must be an object."
            })

        table_number = config.get("table_number", index)
        pot_count = config.get("pot_count")

        if (
            not isinstance(table_number, int)
            or table_number < 1
            or table_number > MAX_TABLES_PER_EXPERIMENT
        ):
            raise serializers.ValidationError({
                "table_configs": f"Table number must be a whole number from 1 to {MAX_TABLES_PER_EXPERIMENT}."
            })

        if table_number in seen_table_numbers:
            raise serializers.ValidationError({
                "table_configs": "Table numbers cannot be duplicated."
            })

        if (
            not isinstance(pot_count, int)
            or pot_count < 1
            or pot_count > MAX_POTS_PER_TABLE
        ):
            raise serializers.ValidationError({
                "table_configs": f"Number of pots for each table must be a whole number from 1 to {MAX_POTS_PER_TABLE}."
            })

        seen_table_numbers.add(table_number)
        normalized_configs.append({
            "table_number": table_number,
            "pot_count": pot_count
        })

    return sorted(normalized_configs, key=lambda item: item["table_number"])


def measurement_filter_for_table_configs(table_configs):
    query = Q()

    for config in table_configs:
        query |= Q(
            table_number=config["table_number"],
            pot_number__lte=config["pot_count"]
        )

    return query

# CREATE/READ EXPERIMENT
class ExperimentSerializer(serializers.ModelSerializer):
    device_assignments = serializers.SerializerMethodField()

    class Meta:
        model = Experiment
        fields = [
            'id',
            'name',
            'description',
            'plant_name',
            'owner',
            'collaborators',
            'sensor_package_variant',
            'table_count',
            'pots_per_table',
            'table_configs',
            'measurement_frequency_seconds',
            'sensor_frequencies',
            'created_at',
            'started_at',
            'planned_end_at',
            'finished_at',
            'status',
            'is_public',
            'device_assignments'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'device_assignments']

    def _time_ranges_overlap(self, first_start, first_end, second_start, second_end):
        if first_start is None or second_start is None:
            return first_start is None and second_start is None

        if first_end is not None and second_start is not None and first_end <= second_start:
            return False

        if second_end is not None and first_start is not None and second_end <= first_start:
            return False

        return True

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

        sensor_package_variant = data.get(
            'sensor_package_variant',
            getattr(instance, 'sensor_package_variant', None)
        )

        if sensor_package_variant is not None and sensor_package_variant < 1:
            raise serializers.ValidationError({
                "sensor_package_variant": "Id zestawu czujników musi być większe od 0."
            })
        
        raw_table_count = data.get(
            'table_count',
            getattr(instance, 'table_count', None)
        )

        table_count = raw_table_count
        if table_count is not None and (
            not isinstance(table_count, int)
            or table_count < 1
            or table_count > MAX_TABLES_PER_EXPERIMENT
        ):
            raise serializers.ValidationError({
                "table_count": f"Number of tables must be a whole number from 1 to {MAX_TABLES_PER_EXPERIMENT}."
            })

        raw_pots_per_table = data.get(
            'pots_per_table',
            getattr(instance, 'pots_per_table', None)
        )

        pots_per_table = raw_pots_per_table
        if pots_per_table is not None and (
            not isinstance(pots_per_table, int)
            or pots_per_table < 1
            or pots_per_table > MAX_POTS_PER_TABLE
        ):
            raise serializers.ValidationError({
                "pots_per_table": f"Number of pots per table must be a whole number from 1 to {MAX_POTS_PER_TABLE}."
            })

        raw_table_configs = data.get(
            'table_configs',
            getattr(instance, 'table_configs', None)
        )

        table_configs = normalize_table_configs(
            raw_table_configs,
            table_count=table_count,
            pots_per_table=pots_per_table
        )

        data['table_configs'] = table_configs
        data['table_count'] = len(table_configs)
        data['pots_per_table'] = max(config["pot_count"] for config in table_configs)

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

        if not started_at:
            raise serializers.ValidationError({
                "started_at": "Data rozpoczęcia eksperymentu jest wymagana."
            })

        if not planned_end_at:
            raise serializers.ValidationError({
                "planned_end_at": "Planowana data zakończenia eksperymentu jest wymagana."
            })

        if finished_at and not started_at:
            raise serializers.ValidationError({
                "finished_at": "Nie można zakończyć eksperymentu, który nie ma daty rozpoczęcia."
            })
                
        if started_at and finished_at and finished_at < started_at:
            raise serializers.ValidationError({
                "finished_at": "Data zakończenia eksperymentu musi być nie wcześniejsza niż data rozpoczęcia eksperymentu."
            })

        if planned_end_at < started_at:
            raise serializers.ValidationError({
                "planned_end_at": "Planowana data zakończenia nie może być wcześniejsza niż data rozpoczęcia."
            })

        return data

    def get_device_assignments(self, obj):
        assignments = obj.device_assignments.select_related('device', 'experiment').all()
        return SensorDeviceAssignmentSerializer(assignments, many=True).data

    def _get_available_devices(self, experiment):
        overlapping_assignment_ids = SensorDeviceAssignment.objects.filter(
            assigned_from__lt=experiment.planned_end_at,
            assigned_to__gt=experiment.started_at,
        ).values_list('device_id', flat=True)

        return SensorDevice.objects.filter(
            is_active=True,
            max_sensor_package_variant__gte=experiment.sensor_package_variant,
        ).exclude(
            id__in=overlapping_assignment_ids
        ).order_by('code')

    def _assign_devices(self, experiment):
        table_configs = experiment.normalized_table_configs()
        required_count = sum(config["pot_count"] for config in table_configs)

        if required_count <= 0:
            return

        if not SensorDevice.objects.exists():
            return

        available_devices = list(self._get_available_devices(experiment)[:required_count])

        if len(available_devices) < required_count:
            raise serializers.ValidationError({
                "devices": f"Not enough free sensor devices for this experiment. Required: {required_count}, available: {len(available_devices)}."
            })

        assignments = []
        device_index = 0

        for config in table_configs:
            for pot_number in range(1, config["pot_count"] + 1):
                assignments.append(SensorDeviceAssignment(
                    experiment=experiment,
                    device=available_devices[device_index],
                    table_number=config["table_number"],
                    pot_number=pot_number,
                    assigned_from=experiment.started_at,
                    assigned_to=experiment.planned_end_at,
                ))
                device_index += 1

        SensorDeviceAssignment.objects.bulk_create(assignments)

    def create(self, validated_data):
        experiment = super().create(validated_data)

        try:
            self._assign_devices(experiment)
        except serializers.ValidationError:
            experiment.delete()
            raise

        return experiment

# UPDATE EXPERIMENT
class ExperimentUpdateSerializer(ExperimentSerializer):
    NONCHANGEABLE_FIELDS = {
        "sensor_package_variant",
        "owner",
        "created_at",
        'finished_at',
    }

    class Meta(ExperimentSerializer.Meta):
        read_only_fields = ExperimentSerializer.Meta.read_only_fields + [
            "sensor_package_variant",
            "owner",
            "created_at",
            'finished_at'
        ]

    def validate(self, data):
        forbidden_fields = self.NONCHANGEABLE_FIELDS.intersection(self.initial_data.keys())
        

        if forbidden_fields:
            errors = {}

            if "sensor_package_variant" in forbidden_fields:
                errors["sensor_package_variant"] = "Nie można edytować zestawu sensorów."

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
            measurement_filter_for_table_configs(obj.normalized_table_configs())
        ).order_by('-created_at')

        if obj.started_at:
            measurements = measurements.filter(created_at__gte=obj.started_at)

        if obj.finished_at:
            measurements = measurements.filter(created_at__lte=obj.finished_at)

        return MeasurementSerializer(measurements, many=True).data




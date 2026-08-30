from rest_framework import serializers

from measurements.models import Measurement
from measurements.serializers import MeasurementSerializer
from .models import (
    Experiment,
    ExperimentalFactor,
    FactorLevel,
    Keyword,
    Pot,
    PotHardwareAssignment,
    Treatment,
)


ALLOWED_SENSOR_FREQUENCY_KEYS = {
    'soil_moisture',
    'light',
    'soil_temperature',
    'air_temperature',
    'air_humidity',
    'pressure',
}


class KeywordListField(serializers.Field):
    default_error_messages = {
        "not_a_list": "Słowa kluczowe muszą być listą.",
        "empty": "Podaj co najmniej jedno słowo kluczowe.",
        "blank": "Słowo kluczowe nie może być puste.",
        "too_long": "Słowo kluczowe może mieć maksymalnie 50 znaków.",
        "too_many": "Można podać maksymalnie 15 słów kluczowych.",
    }

    def to_representation(self, value):
        return list(value.order_by("name").values_list("name", flat=True))

    def to_internal_value(self, data):
        if not isinstance(data, list):
            self.fail("not_a_list")
        if not data:
            self.fail("empty")
        if len(data) > 15:
            self.fail("too_many")

        normalized = []
        for value in data:
            if not isinstance(value, str) or not value.strip():
                self.fail("blank")
            keyword = " ".join(value.split()).casefold()
            if len(keyword) > 50:
                self.fail("too_long")
            if keyword not in normalized:
                normalized.append(keyword)

        return normalized

# CREATE/READ EXPERIMENT
class ExperimentSerializer(serializers.ModelSerializer):
    keywords = KeywordListField(required=True)
    pot_numbers = serializers.SerializerMethodField()

    class Meta:
        model = Experiment
        fields = [
            'id',
            'name',
            'description',
            'plant_name',
            'keywords',
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
            'is_public',
            'pot_numbers',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def _set_keywords(self, experiment, keyword_names):
        keywords = [
            Keyword.objects.get_or_create(name=name)[0]
            for name in keyword_names
        ]
        experiment.keywords.set(keywords)

    def get_pot_numbers(self, obj):
        return list(
            obj.pots.filter(is_monitored=True)
            .order_by("position")
            .values_list("position", flat=True)
        )

    def create(self, validated_data):
        keyword_names = validated_data.pop("keywords")
        experiment = super().create(validated_data)
        self._set_keywords(experiment, keyword_names)
        return experiment

    def update(self, instance, validated_data):
        keyword_names = validated_data.pop("keywords", None)
        experiment = super().update(instance, validated_data)
        if keyword_names is not None:
            self._set_keywords(experiment, keyword_names)
        return experiment

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

        if sensor_set_id:
            experiments_for_sensor_set = Experiment.objects.filter(
                sensor_set_id=sensor_set_id,
                finished_at__isnull=True
            )

            if instance:
                experiments_for_sensor_set = experiments_for_sensor_set.exclude(pk=instance.pk)

            current_end_at = finished_at or planned_end_at

            for experiment in experiments_for_sensor_set:
                experiment_end_at = experiment.finished_at or experiment.planned_end_at

                if self._time_ranges_overlap(
                    started_at,
                    current_end_at,
                    experiment.started_at,
                    experiment_end_at
                ):
                    raise serializers.ValidationError({
                        "sensor_set_id": "Istnieje już eksperyment dla tego zestawu czujników w wybranym terminie."
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


class FactorLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = FactorLevel
        fields = ["id", "label", "value", "is_reference", "position"]


class ExperimentalFactorSerializer(serializers.ModelSerializer):
    levels = FactorLevelSerializer(many=True, read_only=True)

    class Meta:
        model = ExperimentalFactor
        fields = ["id", "name", "unit", "position", "levels"]


class PotHardwareAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PotHardwareAssignment
        fields = ["id", "component_type", "component_identifier"]


class PotSerializer(serializers.ModelSerializer):
    hardware_assignments = PotHardwareAssignmentSerializer(many=True, read_only=True)
    treatment_name = serializers.CharField(source="treatment.name", read_only=True)
    treatment_levels = serializers.SerializerMethodField()

    class Meta:
        model = Pot
        fields = [
            "id",
            "label",
            "replicate_number",
            "position",
            "is_monitored",
            "treatment",
            "treatment_name",
            "treatment_levels",
            "hardware_assignments",
        ]

    def get_treatment_levels(self, obj):
        links = obj.treatment.treatmentfactorlevel_set.select_related("factor", "level")
        return [
            {
                "factor": link.factor.name,
                "level": link.level.label,
                "is_reference": link.level.is_reference,
            }
            for link in links.order_by("factor__position", "factor_id")
        ]


class TreatmentSerializer(serializers.ModelSerializer):
    levels = FactorLevelSerializer(many=True, read_only=True)

    class Meta:
        model = Treatment
        fields = ["id", "name", "position", "levels"]


class FactorLevelDefinitionSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=100)
    value = serializers.CharField(max_length=100, required=False, allow_blank=True)
    is_reference = serializers.BooleanField(default=False)


class FactorDefinitionSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    unit = serializers.CharField(max_length=30, required=False, allow_blank=True)
    levels = FactorLevelDefinitionSerializer(many=True, min_length=2)

    def validate_levels(self, levels):
        labels = [level["label"].strip().casefold() for level in levels]
        if len(labels) != len(set(labels)):
            raise serializers.ValidationError("Poziomy jednego czynnika muszą mieć różne nazwy.")
        if sum(level.get("is_reference", False) for level in levels) != 1:
            raise serializers.ValidationError(
                "Każdy czynnik musi mieć dokładnie jeden poziom odniesienia."
            )
        return levels


class PotAssignmentDefinitionSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=30)
    is_monitored = serializers.BooleanField(default=False)
    soil_moisture = serializers.CharField(max_length=100, required=False, allow_blank=True)
    soil_temperature = serializers.CharField(max_length=100, required=False, allow_blank=True)
    pump = serializers.CharField(max_length=100, required=False, allow_blank=True)


class CameraAssignmentDefinitionSerializer(serializers.Serializer):
    camera_id = serializers.IntegerField(min_value=1)
    pot_label = serializers.CharField(max_length=30)


class ExperimentDesignWriteSerializer(serializers.Serializer):
    factors = FactorDefinitionSerializer(many=True, min_length=1)
    repetitions = serializers.IntegerField(min_value=1, max_value=50)
    selected_combinations = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField(max_length=100)),
        required=False,
    )
    pot_assignments = PotAssignmentDefinitionSerializer(many=True, required=False)
    camera_assignments = CameraAssignmentDefinitionSerializer(many=True, required=False)

    def validate_factors(self, factors):
        names = [factor["name"].strip().casefold() for factor in factors]
        if len(names) != len(set(names)):
            raise serializers.ValidationError("Czynniki muszą mieć różne nazwy.")
        return factors


class ExperimentDesignReadSerializer(serializers.ModelSerializer):
    factors = ExperimentalFactorSerializer(many=True, read_only=True)
    treatments = TreatmentSerializer(many=True, read_only=True)
    pots = PotSerializer(many=True, read_only=True)
    camera_assignments = serializers.SerializerMethodField()

    class Meta:
        model = Experiment
        fields = ["id", "sensor_set_id", "factors", "treatments", "pots", "camera_assignments"]

    def get_camera_assignments(self, obj):
        return [
            {
                "id": assignment.id,
                "camera_id": assignment.camera_id,
                "camera_name": assignment.camera.name,
                "pot_id": assignment.pot_id,
                "pot_label": assignment.pot.label,
            }
            for assignment in obj.camera_assignments.select_related("camera", "pot")
        ]

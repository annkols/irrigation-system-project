from rest_framework import serializers

from django.contrib.auth import get_user_model
from django.db import transaction

from users.serializers import UserSearchSerializer
from measurements.models import Measurement
from measurements.serializers import MeasurementSerializer
from .models import Experiment, Keyword, ExperimentCollaborator

User = get_user_model()

ALLOWED_SENSOR_FREQUENCY_KEYS = {
    'soil_moisture',
    'light',
    'soil_temperature',
    'air_temperature',
    'air_humidity',
    'pressure',
}

# KEYWORDS
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

# MODEL THROUGH USERS -> EXPERIMENTS
class CollaboratorAssignmentSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=User.objects.filter(is_active=True),
    )

    can_edit_experiment = serializers.BooleanField(default=False)
    can_end_experiment = serializers.BooleanField(default=False)


class ExperimentCollaboratorSerializer(serializers.ModelSerializer):
    user = UserSearchSerializer(read_only=True)

    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=User.objects.filter(is_active=True),
        write_only=True,
    )

    class Meta:
        model = ExperimentCollaborator

        fields = [
            "id",
            "user",
            "user_id",
            "can_edit_experiment",
            "can_end_experiment",
            "added_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "added_at",
        ]


class ExperimentCollaboratorPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperimentCollaborator

        fields = [
            "can_edit_experiment",
            "can_end_experiment",
        ]

# CREATE/READ EXPERIMENT
class ExperimentSerializer(serializers.ModelSerializer):
    keywords = KeywordListField(required=True)

    initial_collaborators = CollaboratorAssignmentSerializer(
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = Experiment

        fields = [
            'id',
            'name',
            'description',
            'plant_name',
            'keywords',
            'owner',
            "initial_collaborators",
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
        read_only_fields = ['id', 'owner', 'status', 'created_at']

    def _set_keywords(self, experiment, keyword_names):
        keywords = [
            Keyword.objects.get_or_create(name=name)[0]
            for name in keyword_names
        ]
        experiment.keywords.set(keywords)

    def create(self, validated_data):
        keyword_names = validated_data.pop("keywords")
        initial_collaborators = validated_data.pop(
            "initial_collaborators",
            [],
        )

        with transaction.atomic():
            experiment = Experiment.objects.create(**validated_data)

            self._set_keywords(
                experiment,
                keyword_names,
            )

            ExperimentCollaborator.objects.bulk_create([
                ExperimentCollaborator(
                    experiment=experiment,
                    user=item["user"],
                    can_edit_experiment=item["can_edit_experiment"],
                    can_end_experiment=item["can_end_experiment"],
                )
                for item in initial_collaborators
            ])

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

    def validate_initial_collaborators(self, collaborators):
        if len(collaborators) > 50:
            raise serializers.ValidationError(
                "Eksperyment może mieć maksymalnie 50 współpracowników."
            )

        user_ids = [
            collaborator["user"].id
            for collaborator in collaborators
        ]

        if len(user_ids) != len(set(user_ids)):
            raise serializers.ValidationError(
                "Ten sam użytkownik nie może zostać dodany więcej niż raz."
            )

        request = self.context.get("request")

        if (
            request
            and request.user.is_authenticated
            and request.user.id in user_ids
        ):
            raise serializers.ValidationError(
                "Właściciel eksperymentu nie może być współpracownikiem."
            )

        return collaborators

# UPDATE EXPERIMENT
class ExperimentUpdateSerializer(ExperimentSerializer):
    NONCHANGEABLE_FIELDS = {
        "sensor_set_id",
        "owner",
        "created_at",
        "finished_at",
    }

    initial_collaborators = None

    class Meta(ExperimentSerializer.Meta):
        fields = [
            field
            for field in ExperimentSerializer.Meta.fields
            if field != "initial_collaborators"
        ]

        read_only_fields = ExperimentSerializer.Meta.read_only_fields + [
            "sensor_set_id",
            "finished_at",
        ]

    def validate(self, data):
        forbidden_fields = (
            self.NONCHANGEABLE_FIELDS
            .intersection(self.initial_data.keys())
        )

        if forbidden_fields:
            errors = {}

            if "sensor_set_id" in forbidden_fields:
                errors["sensor_set_id"] = ("Nie można edytować zestawu sensorów.")

            if "owner" in forbidden_fields:
                errors["owner"] = ("Nie można zmienić właściciela eksperymentu.")

            if "created_at" in forbidden_fields:
                errors["created_at"] = ("Nie można edytować daty stworzenia eksperymentu.")

            if "finished_at" in forbidden_fields:
                errors["finished_at"] = ("Nie można edytować daty zakończenia eksperymentu.")

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

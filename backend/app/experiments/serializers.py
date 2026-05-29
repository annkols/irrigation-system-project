from rest_framework import serializers

from measurements.models import Measurement
from measurements.serializers import MeasurementSerializer
from .models import Experiment


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
            'started_at',
            'finished_at',
            'status',
            'created_at',
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

        started_at = data.get(
            'started_at',
            getattr(instance, 'started_at', None)
        )

        finished_at = data.get(
            'finished_at',
            getattr(instance, 'finished_at', None)
        )

        if finished_at and not started_at:
            raise serializers.ValidationError({
                "finished_at": "Nie można zakończyć eksperymentu, który nie ma daty rozpoczęcia."
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
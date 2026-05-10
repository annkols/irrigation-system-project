from rest_framework import serializers
from .models import Experiment


class ExperimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experiment
        fields = [
            'id',
            'name',
            'description',
            'plant_name',
            'sensor_set_id',
            'started_at',
            'finished_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
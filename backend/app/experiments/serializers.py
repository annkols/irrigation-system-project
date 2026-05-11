from rest_framework import serializers
from .models import Experiment

def validate(self, data):
    owner = data.get('owner')
    collaborators = data.get('collaborators', [])

    if owner and owner in collaborators:
        raise serializers.ValidationError(
            "Owner cannot also be a collaborator."
        )

    return data

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
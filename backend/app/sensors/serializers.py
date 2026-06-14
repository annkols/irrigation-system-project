from rest_framework import serializers
from .models import Sensor, SensorDevice, SensorDeviceAssignment

class SensorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sensor
        fields = [
            'id',
            'code',
            'name',
            'sensor_package_variant',
            'sensor_type',
            'unit',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SensorDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorDevice
        fields = [
            'id',
            'code',
            'name',
            'max_sensor_package_variant',
            'is_active',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SensorDeviceAssignmentSerializer(serializers.ModelSerializer):
    device_code = serializers.CharField(source='device.code', read_only=True)
    experiment_name = serializers.CharField(source='experiment.name', read_only=True)

    class Meta:
        model = SensorDeviceAssignment
        fields = [
            'id',
            'experiment',
            'experiment_name',
            'device',
            'device_code',
            'table_number',
            'pot_number',
            'assigned_from',
            'assigned_to',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'device_code', 'experiment_name']

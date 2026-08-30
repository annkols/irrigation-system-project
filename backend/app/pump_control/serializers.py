from rest_framework import serializers

from .models import PumpCommand


class PumpCommandSerializer(serializers.ModelSerializer):
    arduino_command = serializers.SerializerMethodField()

    class Meta:
        model = PumpCommand
        fields = [
            'id',
            'command',
            'station_number',
            'pot_number',
            'arduino_command',
            'created_at',
        ]
        read_only_fields = ['id', 'arduino_command', 'created_at']

    def get_arduino_command(self, obj):
        return f"PUMP_{obj.command}"

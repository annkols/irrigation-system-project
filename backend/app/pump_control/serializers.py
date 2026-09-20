from rest_framework import serializers

from .models import PumpCommand


class PumpCommandSerializer(serializers.ModelSerializer):
    arduino_command = serializers.SerializerMethodField()

    class Meta:
        model = PumpCommand
        fields = [
            'id',
            'command',
            'duration_seconds',
            'station_number',
            'pot_number',
            'arduino_command',
            'created_at',
        ]
        read_only_fields = ['id', 'arduino_command', 'created_at']

    def get_arduino_command(self, obj):
        if obj.command == PumpCommand.Command.ON and obj.duration_seconds:
            return f"PUMP_ON:{obj.duration_seconds}"
        return f"PUMP_{obj.command}"

    def validate(self, attrs):
        command = attrs.get('command', getattr(self.instance, 'command', None))
        duration = attrs.get('duration_seconds')

        if duration is not None and command != PumpCommand.Command.ON:
            raise serializers.ValidationError({
                'duration_seconds': 'Czas pracy można podać tylko dla komendy ON.'
            })
        if duration is not None and not 1 <= duration <= 300:
            raise serializers.ValidationError({
                'duration_seconds': 'Czas pracy musi wynosić od 1 do 300 sekund.'
            })
        return attrs

from rest_framework import serializers
from .models import BBCHObservation, Note, NoteImage


class NoteImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = NoteImage
        fields = ['id', 'image', 'image_url', 'uploaded_at']
        read_only_fields = ['id', 'image_url', 'uploaded_at']
        extra_kwargs = {
            'image': {'write_only': True},
        }

    def get_image_url(self, obj):
        path = f'/api/note-images/{obj.pk}/content/'
        request = self.context.get('request')
        return request.build_absolute_uri(path) if request else path


class NoteSerializer(serializers.ModelSerializer):
    images = NoteImageSerializer(many=True, read_only=True)

    class Meta:
        model = Note
        fields = ['id', 'experiment', 'title', 'content', 'images', 'created_at', 'updated_at', 'author']
        read_only_fields = ['id', 'experiment', 'images', 'created_at', 'updated_at', 'author']


class BBCHObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BBCHObservation
        fields = [
            'id',
            'experiment',
            'observation_date',
            'phase',
            'remarks',
            'created_at',
            'author',
        ]
        read_only_fields = ['id', 'experiment', 'created_at', 'author']

    def validate_phase(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('BBCH phase is required.')
        return value

from rest_framework import serializers
from .models import BBCHObservation, Note, NoteAttachment, NoteImage


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


class NoteAttachmentSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='original_name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = NoteAttachment
        fields = ['id', 'name', 'size', 'file_url', 'uploaded_at']
        read_only_fields = fields

    def get_file_url(self, obj):
        path = f'/api/note-attachments/{obj.pk}/content/'
        request = self.context.get('request')
        return request.build_absolute_uri(path) if request else path


class NoteSerializer(serializers.ModelSerializer):
    images = NoteImageSerializer(many=True, read_only=True)
    attachments = NoteAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Note
        fields = ['id', 'experiment', 'title', 'content', 'images', 'attachments', 'created_at', 'updated_at', 'author']
        read_only_fields = ['id', 'experiment', 'images', 'attachments', 'created_at', 'updated_at', 'author']


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

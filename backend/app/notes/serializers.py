from rest_framework import serializers
from .models import Note, NoteImage


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
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class NoteSerializer(serializers.ModelSerializer):
    images = NoteImageSerializer(many=True, read_only=True)

    class Meta:
        model = Note
        fields = ['id', 'experiment', 'title', 'content', 'images', 'created_at', 'updated_at']
        read_only_fields = ['id', 'experiment', 'images', 'created_at', 'updated_at']

from rest_framework import serializers
from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = ['id', 'experiment', 'title', 'content', 'image', 'image_url', 'created_at']
        read_only_fields = ['id', 'created_at', 'image_url']
        extra_kwargs = {
            'image': {'write_only': True, 'required': False},
            'experiment': {'read_only': True},
        }

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

from rest_framework import serializers

from .models import CameraFrame


class CameraFrameSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CameraFrame
        fields = [
            "id",
            "experiment",
            "camera",
            "image_url",
            "captured_at",
            "captured_by",
            "note",
        ]
        read_only_fields = fields

    def get_image_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

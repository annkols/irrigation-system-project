from rest_framework import serializers

from .models import CameraFrame


class CameraFrameSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CameraFrame
        fields = [
            "id",
            "experiment",
            "pot",
            "camera",
            "image_url",
            "captured_at",
            "captured_by",
            "note",
        ]
        read_only_fields = fields

    def get_image_url(self, obj):
        request = self.context.get("request")
        path = f"/api/frames/{obj.pk}/image/"
        return request.build_absolute_uri(path) if request else path

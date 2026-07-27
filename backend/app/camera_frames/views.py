from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

from django.conf import settings
from django.core.files.base import ContentFile
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from experiments.models import Experiment

from .models import CameraFrame
from .serializers import CameraFrameSerializer


MAX_FRAME_SIZE = 5 * 1024 * 1024


class CameraStreamView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        if not settings.CAMERA_STREAM_URL:
            return Response(
                {"detail": "CAMERA_STREAM_URL is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        camera_request = Request(
            settings.CAMERA_STREAM_URL,
            headers={"User-Agent": "PlantStalker-backend"},
        )

        try:
            camera_response = urlopen(camera_request, timeout=10)
        except (HTTPError, URLError, TimeoutError):
            return Response(
                {"detail": "Could not connect to the camera stream."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        content_type = camera_response.headers.get(
            "Content-Type",
            "multipart/x-mixed-replace; boundary=frame",
        )

        def stream_chunks():
            try:
                while chunk := camera_response.read(16 * 1024):
                    yield chunk
            finally:
                camera_response.close()

        return StreamingHttpResponse(stream_chunks(), content_type=content_type)


class ExperimentFrameListView(generics.ListAPIView):
    serializer_class = CameraFrameSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        get_object_or_404(Experiment, pk=self.kwargs["experiment_id"])
        return CameraFrame.objects.filter(experiment_id=self.kwargs["experiment_id"])


class CaptureFrameView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, experiment_id):
        experiment = get_object_or_404(Experiment, pk=experiment_id)

        if not settings.CAMERA_JPG_URL:
            return Response(
                {"detail": "CAMERA_JPG_URL is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        camera_request = Request(
            settings.CAMERA_JPG_URL,
            headers={"User-Agent": "PlantStalker-backend"},
        )

        try:
            with urlopen(camera_request, timeout=5) as camera_response:
                content_type = camera_response.headers.get_content_type()
                image_bytes = camera_response.read(MAX_FRAME_SIZE + 1)
        except (HTTPError, URLError, TimeoutError):
            return Response(
                {"detail": "Could not connect to the camera."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if content_type != "image/jpeg":
            return Response(
                {"detail": "The camera did not return a JPEG image."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not image_bytes:
            return Response(
                {"detail": "The camera returned an empty image."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if len(image_bytes) > MAX_FRAME_SIZE:
            return Response(
                {"detail": "The camera image is too large."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        frame = CameraFrame(
            experiment=experiment,
            captured_by=request.user if request.user.is_authenticated else None,
            note=str(request.data.get("note", ""))[:255],
        )
        frame.image.save(f"{uuid4()}.jpg", ContentFile(image_bytes), save=True)

        serializer = CameraFrameSerializer(frame, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CameraFrameDeleteView(generics.DestroyAPIView):
    queryset = CameraFrame.objects.all()
    permission_classes = [AllowAny]
    authentication_classes = []

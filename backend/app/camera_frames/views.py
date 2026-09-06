from uuid import uuid4

from django.core.files.base import ContentFile
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from experiments.models import Experiment, ExperimentCameraAssignment

from .models import CameraDevice, CameraFrame
from .serializers import CameraFrameSerializer


MAX_FRAME_SIZE = 5 * 1024 * 1024


class CameraFrameUploadView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            sensor_set_id = int(request.headers.get("X-Sensor-Set-ID", ""))
        except ValueError:
            return Response(
                {"detail": "X-Sensor-Set-ID must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        supplied_token = request.headers.get("X-Camera-Token", "")
        devices = CameraDevice.objects.filter(
            sensor_set_id=sensor_set_id,
            is_active=True,
        )
        device = next(
            (candidate for candidate in devices if candidate.token_matches(supplied_token)),
            None,
        )
        if device is None:
            return Response(
                {"detail": "Invalid camera credentials."},
                status=status.HTTP_403_FORBIDDEN,
            )

        content_type = request.content_type or ""
        if content_type.split(";", 1)[0].strip().lower() != "image/jpeg":
            return Response(
                {"detail": "The request body must contain a JPEG image."},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

        content_length = request.META.get("CONTENT_LENGTH")
        if content_length:
            try:
                if int(content_length) > MAX_FRAME_SIZE:
                    return Response(
                        {"detail": "The camera image is too large."},
                        status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    )
            except ValueError:
                return Response(
                    {"detail": "Invalid Content-Length header."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        image_bytes = request.body
        if not image_bytes:
            return Response(
                {"detail": "The camera returned an empty image."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(image_bytes) > MAX_FRAME_SIZE:
            return Response(
                {"detail": "The camera image is too large."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        experiment = (
            Experiment.objects.filter(
                sensor_set_id=sensor_set_id,
                started_at__lte=timezone.now(),
                finished_at__isnull=True,
            )
            .order_by("-started_at")
            .first()
        )
        if experiment is None:
            return Response(
                {"detail": "There is no active experiment for this sensor set."},
                status=status.HTTP_409_CONFLICT,
            )

        frame = CameraFrame(
            experiment=experiment,
            camera=device,
            note="Automatic camera upload",
        )
        frame.image.save(f"{uuid4()}.jpg", ContentFile(image_bytes), save=True)
        serializer = CameraFrameSerializer(frame, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LatestExperimentFrameImageView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, experiment_id):
        get_object_or_404(Experiment, pk=experiment_id)
        frames = CameraFrame.objects.filter(experiment_id=experiment_id)
        pot_number = request.query_params.get("pot_number")
        if pot_number:
            try:
                pot_number = int(pot_number)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "pot_number must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            assignment = ExperimentCameraAssignment.objects.filter(
                experiment_id=experiment_id,
                pot__position=pot_number,
            ).first()
            if assignment is None:
                return Response(
                    {"detail": "No camera is assigned to this pot."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            frames = frames.filter(camera_id=assignment.camera_id)

        frame = frames.first()
        if frame is None:
            return Response(
                {"detail": "No camera frame has been uploaded for this experiment."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = FileResponse(
            frame.image.open("rb"),
            content_type="image/jpeg",
        )
        response["Cache-Control"] = "no-store"
        return response


class ExperimentFrameListView(generics.ListAPIView):
    serializer_class = CameraFrameSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        get_object_or_404(Experiment, pk=self.kwargs["experiment_id"])
        return CameraFrame.objects.filter(experiment_id=self.kwargs["experiment_id"])


class CameraFrameDeleteView(generics.DestroyAPIView):
    queryset = CameraFrame.objects.all()
    permission_classes = [AllowAny]
    authentication_classes = []

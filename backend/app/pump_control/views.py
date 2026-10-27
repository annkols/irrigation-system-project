from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from django.utils import timezone

from .models import PumpCommand
from .serializers import PumpCommandSerializer

from experiments.models import Experiment, Pot
from experiments.permissions import CanControlPump

class PumpCommandListCreateView(generics.ListCreateAPIView):
    queryset = PumpCommand.objects.all()
    serializer_class = PumpCommandSerializer

    def perform_create(self, serializer):
        station_number = serializer.validated_data.get("station_number", 1)
        pot_number = serializer.validated_data.get("pot_number", 1)

        experiment = (
            Experiment.objects.filter(
                sensor_set_id=station_number,
                started_at__lte=timezone.now(),
                finished_at__isnull=True,
            )
            .order_by("-started_at")
            .first()
        )

        if experiment is None:
            raise ValidationError({
                "station_number": "Dla danego zestawu czujników nie istnieje aktywny eksperyment"
            })

        if not Pot.objects.filter(
            experiment=experiment,
            position=pot_number,
        ).exists():
            raise ValidationError({
                "pot_number": "Doniczka nie należy do aktywnego eksperymentu."
            })

        self.check_object_permissions(self.request, experiment)

        serializer.save()

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanControlPump()]

        return [AllowAny()]


    def get_queryset(self):
        queryset = super().get_queryset()
        station_number = self.request.query_params.get('station_number')
        pot_number = self.request.query_params.get('pot_number')
        if station_number:
            queryset = queryset.filter(station_number=station_number)
        if pot_number:
            queryset = queryset.filter(pot_number=pot_number)
        return queryset


class PumpCommandLatestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        queryset = PumpCommand.objects.all()
        station_number = request.query_params.get('station_number')
        pot_number = request.query_params.get('pot_number')
        if station_number:
            queryset = queryset.filter(station_number=station_number)
        if pot_number:
            queryset = queryset.filter(pot_number=pot_number)
        latest_command = queryset.first()

        if not latest_command:
            return Response(
                {'detail': 'Brak komend sterowania pompa.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PumpCommandSerializer(latest_command)
        return Response(serializer.data, status=status.HTTP_200_OK)

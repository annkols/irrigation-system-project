from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Experiment
from .serializers import (
    ALLOWED_SENSOR_FREQUENCY_KEYS,
    ExperimentSerializer,
    ExperimentWithMeasurementsSerializer,
    ExperimentUpdateSerializer
)

from rest_framework.exceptions import ValidationError

# Create your views here.
class ExperimentListCreateView(generics.ListCreateAPIView):
    queryset = Experiment.objects.all().order_by('-created_at')
    serializer_class = ExperimentSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class ExperimentDetailView(generics.RetrieveAPIView):
    queryset = Experiment.objects.all()
    serializer_class = ExperimentSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class ExperimentStatusListView(generics.ListAPIView):
    serializer_class = ExperimentSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        status = self.kwargs['status']

        if status == 'not-started':
            return Experiment.objects.filter(
                started_at__isnull=True,
                finished_at__isnull=True
            ).order_by('-created_at')

        if status == 'in-progress':
            return Experiment.objects.filter(
                started_at__isnull=False,
                finished_at__isnull=True
            ).order_by('-created_at')

        if status == 'completed':
            return Experiment.objects.filter(
                finished_at__isnull=False
            ).order_by('-created_at')

        raise ValidationError({
            "status": "Wybierz z dostępnych statusów: not-started, in-progress, completed."
        })
    
class ExperimentUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Experiment.objects.all()
    serializer_class = ExperimentUpdateSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    
class ActiveExperimentSensorConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        sensor_set_id = request.query_params.get('sensor_set_id', 1)

        experiment = (
            Experiment.objects
            .filter(sensor_set_id=sensor_set_id, finished_at__isnull=True)
            .order_by('-created_at')
            .first()
        )

        if not experiment:
            return Response(
                {"detail": "Brak aktywnego eksperymentu dla tego zestawu czujnikow."},
                status=status.HTTP_404_NOT_FOUND
            )

        frequencies = {
            key: 0
            for key in ALLOWED_SENSOR_FREQUENCY_KEYS
        }

        if experiment.sensor_frequencies:
            frequencies.update(experiment.sensor_frequencies)
        else:
            default_frequency = experiment.measurement_frequency_seconds
            frequencies = {
                key: default_frequency
                for key in ALLOWED_SENSOR_FREQUENCY_KEYS
            }

        if not frequencies.get("soil_moisture"):
            frequencies["soil_moisture"] = experiment.measurement_frequency_seconds

        return Response({
            "experiment_id": experiment.id,
            "sensor_set_id": experiment.sensor_set_id,
            "sensor_frequencies": frequencies,
        })


class ExperimentWithMeasurementsListView(generics.ListAPIView):
    serializer_class = ExperimentWithMeasurementsSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        return Experiment.objects.all().order_by('-created_at')


class ExperimentWithMeasurementsDetailView(generics.RetrieveAPIView):
    serializer_class = ExperimentWithMeasurementsSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        return Experiment.objects.all()

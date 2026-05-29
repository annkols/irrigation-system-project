from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Experiment
from .serializers import ExperimentSerializer, ExperimentWithMeasurementsSerializer
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
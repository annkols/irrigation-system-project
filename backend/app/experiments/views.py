from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Experiment
from .serializers import ExperimentSerializer

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
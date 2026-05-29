from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Sensor
from .serializers import SensorSerializer

# Create your views here.
class SensorListCreateView(generics.ListCreateAPIView):
    queryset = Sensor.objects.all().order_by('id')
    serializer_class = SensorSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class SensorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Sensor.objects.all()
    serializer_class = SensorSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
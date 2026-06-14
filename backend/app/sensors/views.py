from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Sensor, SensorDevice, SensorDeviceAssignment
from .serializers import SensorDeviceAssignmentSerializer, SensorDeviceSerializer, SensorSerializer

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


class SensorDeviceListCreateView(generics.ListCreateAPIView):
    queryset = SensorDevice.objects.all().order_by('code')
    serializer_class = SensorDeviceSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class SensorDeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SensorDevice.objects.all()
    serializer_class = SensorDeviceSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class SensorDeviceAssignmentListView(generics.ListAPIView):
    queryset = SensorDeviceAssignment.objects.select_related('device', 'experiment').all()
    serializer_class = SensorDeviceAssignmentSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

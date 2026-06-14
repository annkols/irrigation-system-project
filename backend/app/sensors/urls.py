from django.urls import path
from .views import (
    SensorDetailView,
    SensorDeviceAssignmentListView,
    SensorDeviceDetailView,
    SensorDeviceListCreateView,
    SensorListCreateView,
)

urlpatterns = [
    path('sensors/', SensorListCreateView.as_view(), name='sensor-list-create'),
    path('sensors/<int:pk>/', SensorDetailView.as_view(), name='sensor-detail'),
    path('sensor-devices/', SensorDeviceListCreateView.as_view(), name='sensor-device-list-create'),
    path('sensor-devices/<int:pk>/', SensorDeviceDetailView.as_view(), name='sensor-device-detail'),
    path('sensor-device-assignments/', SensorDeviceAssignmentListView.as_view(), name='sensor-device-assignment-list'),
]

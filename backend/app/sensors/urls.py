from django.urls import path
from .views import SensorListCreateView, SensorDetailView

urlpatterns = [
    path('sensors/', SensorListCreateView.as_view(), name='sensor-list-create'),
    path('sensors/<int:pk>/', SensorDetailView.as_view(), name='sensor-detail'),
]

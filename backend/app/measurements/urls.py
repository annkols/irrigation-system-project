from django.urls import path
from .views import (
    MeasurementListCreateView,
    MeasurementDetailView,
    MeasurementLatestView,
)

urlpatterns = [
    path('measurements/latest/', MeasurementLatestView.as_view(), name='measurement-latest'),
    path('measurements/', MeasurementListCreateView.as_view(), name='measurement-list-create'),
    path('measurements/<int:pk>/', MeasurementDetailView.as_view(), name='measurement-detail'),
]
from django.urls import path
from .views import MeasurementExportCSVView



from .views import (
    MeasurementListCreateView,
    MeasurementDetailView,
    MeasurementLatestView,
    MeasurementExportCSVView,
)

urlpatterns = [
    path('measurements/latest/', MeasurementLatestView.as_view(), name='measurement-latest'),
    path('measurements/', MeasurementListCreateView.as_view(), name='measurement-list-create'),
    path('experiments/<int:experiment_id>/export-csv/', MeasurementExportCSVView.as_view(), name='measurement-export-csv'),
    path('measurements/<int:pk>/', MeasurementDetailView.as_view(), name='measurement-detail'),
]
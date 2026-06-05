from django.urls import path
from .views import (
    ActiveExperimentSensorConfigView,
    ExperimentDetailView,
    ExperimentListCreateView,
    ExperimentStatusListView,
    ExperimentWithMeasurementsDetailView,
    ExperimentWithMeasurementsListView,
    ExperimentUpdateView
)

urlpatterns = [
    path('experiments/', ExperimentListCreateView.as_view(), name='experiment-list-create'),
    path('experiments/active-sensor-config/', ActiveExperimentSensorConfigView.as_view(), name='experiment-active-sensor-config'),
    path('experiments/<int:pk>/', ExperimentDetailView.as_view(), name='experiment-detail'),
    path("experiments/<int:pk>/edit/", ExperimentUpdateView.as_view(), name="experiment-edit"),
    path('experiments/status/<str:status>/', ExperimentStatusListView.as_view(), name='experiment-status-list'),
    path('experiments/with-measurements/', ExperimentWithMeasurementsListView.as_view(), name='experiment-with-measurements-list'),
    path('experiments/<int:pk>/with-measurements/', ExperimentWithMeasurementsDetailView.as_view(), name='experiment-with-measurements-detail'),
]

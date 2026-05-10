from django.urls import path
from .views import ExperimentListCreateView, ExperimentDetailView, ExperimentStatusListView

urlpatterns = [
    path('experiments/', ExperimentListCreateView.as_view(), name='experiment-list-create'),
    path('experiments/<int:pk>/', ExperimentDetailView.as_view(), name='experiment-detail'),
    path('experiments/status/<str:status>/', ExperimentStatusListView.as_view(), name='experiment-status-list'),
]
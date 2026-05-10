from django.urls import path
from .views import ExperimentListCreateView, ExperimentDetailView

urlpatterns = [
    path('experiments/', ExperimentListCreateView.as_view(), name='experiment-list-create'),
    path('experiments/<int:pk>/', ExperimentDetailView.as_view(), name='experiment-detail'),
]
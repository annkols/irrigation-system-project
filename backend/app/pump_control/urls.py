from django.urls import path

from .views import PumpCommandLatestView, PumpCommandListCreateView


urlpatterns = [
    path('pump-control/latest/', PumpCommandLatestView.as_view(), name='pump-command-latest'),
    path('pump-control/', PumpCommandListCreateView.as_view(), name='pump-command-list-create'),
]

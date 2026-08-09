from django.urls import path
from . import views

urlpatterns = [
    path('experiments/<int:pk>/notes/', views.ExperimentNoteListCreateView.as_view()),
    path('notes/<int:pk>/', views.NoteDestroyView.as_view()),
]

from rest_framework import generics
from rest_framework.permissions import AllowAny

from experiments.models import Experiment
from .models import Note
from .serializers import NoteSerializer


class ExperimentNoteListCreateView(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        return Note.objects.filter(experiment_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        experiment = Experiment.objects.get(pk=self.kwargs['pk'])
        serializer.save(experiment=experiment)


class NoteDestroyView(generics.DestroyAPIView):
    queryset = Note.objects.all()
    permission_classes = [AllowAny]
    authentication_classes = []

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from django.shortcuts import get_object_or_404

from .models import Note
from .serializers import NoteSerializer

from experiments.models import Experiment
from experiments.permissions import CanViewExperiment, CanEditExperiment


class ExperimentNoteListCreateView(generics.ListCreateAPIView):

    serializer_class = NoteSerializer

    def get_experiment(self):
        return get_object_or_404(Experiment, pk=self.kwargs["pk"])


    def get_queryset(self):
        experiment = self.get_experiment()

        self.check_object_permissions(self.request, experiment)

        return Note.objects.filter(experiment=experiment)


    def get_permissions(self):
        if self.request.method == "GET":
            permission_classes = [IsAuthenticated, CanViewExperiment]
        else:
            permission_classes = [IsAuthenticated, CanEditExperiment]

        return [permission() for permission in permission_classes]


    def perform_create(self, serializer):
        experiment = self.get_experiment()

        self.check_object_permissions(self.request, experiment)

        serializer.save(experiment=experiment)

class NoteDestroyView(generics.DestroyAPIView):

    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated, CanEditExperiment]

    def get_queryset(self):
        return Note.objects.select_related("experiment")

    def get_object(self):
        note = get_object_or_404(self.get_queryset(), pk=self.kwargs["pk"])

        self.check_object_permissions(self.request, note.experiment)

        return note
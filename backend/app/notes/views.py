from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from experiments.models import Experiment
from experiments.permissions import CanEditExperiment, CanViewExperiment
from .models import Note, NoteImage
from .serializers import NoteImageSerializer, NoteSerializer

MAX_IMAGES_PER_NOTE = 10


class ExperimentNoteListCreateView(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        permission = CanViewExperiment if self.request.method == 'GET' else CanEditExperiment
        return [IsAuthenticated(), permission()]

    def get_experiment(self):
        if not hasattr(self, '_experiment'):
            self._experiment = get_object_or_404(Experiment, pk=self.kwargs['pk'])
            self.check_object_permissions(self.request, self._experiment)
        return self._experiment

    def get_queryset(self):
        return (
            Note.objects
            .filter(experiment_id=self.kwargs['pk'])
            .prefetch_related('images')
        )

    def list(self, request, *args, **kwargs):
        self.get_experiment()
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        experiment = self.get_experiment()
        note = serializer.save(experiment=experiment)
        _attach_images(note, self.request.FILES.getlist('images'))


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Note.objects.prefetch_related('images')
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated, CanEditExperiment]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        permission = CanViewExperiment if self.request.method == 'GET' else CanEditExperiment
        return [IsAuthenticated(), permission()]

    def perform_update(self, serializer):
        note = serializer.save()
        _attach_images(note, self.request.FILES.getlist('images'))


class NoteImageDestroyView(generics.DestroyAPIView):
    queryset = NoteImage.objects.select_related('note__experiment')
    serializer_class = NoteImageSerializer
    permission_classes = [IsAuthenticated, CanEditExperiment]


def _attach_images(note, files):
    if not files:
        return
    allowed = MAX_IMAGES_PER_NOTE - note.images.count()
    for image in files[:max(allowed, 0)]:
        NoteImage.objects.create(note=note, image=image)

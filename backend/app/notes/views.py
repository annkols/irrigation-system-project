import mimetypes
from pathlib import PurePosixPath

from django.conf import settings
from django.db import transaction
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.http import content_disposition_header

from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from experiments.models import Experiment
from experiments.permissions import (
    CanDeleteNotes,
    CanEditExperiment,
    CanEditNotes,
    CanViewExperiment,
    IsExperimentOwnerOrCollaborator,
)
from .models import BBCHObservation, Note, NoteAttachment, NoteImage
from .serializers import BBCHObservationSerializer, NoteAttachmentSerializer, NoteImageSerializer, NoteSerializer

MAX_IMAGES_PER_NOTE = 10
MAX_ATTACHMENTS_PER_NOTE = 10
MAX_ATTACHMENT_SIZE = 1 * 1024 * 1024
ALLOWED_ATTACHMENT_EXTENSIONS = ('.pdf', '.docx', '.txt', '.csv', '.xlsx')
_ZIP_SIGNATURE = b'PK\x03\x04'

class ExperimentNoteListCreateView(generics.ListCreateAPIView):

    serializer_class = NoteSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        permission = (
            CanViewExperiment
            if self.request.method in ['GET', 'HEAD']
            else IsExperimentOwnerOrCollaborator
        )
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
        attachments = self.request.FILES.getlist('attachments')
        _validate_attachments(attachments)
        with transaction.atomic():
            note = serializer.save(experiment=experiment, author=self.request.user)
            _attach_images(note, self.request.FILES.getlist('images'))
            _attach_files(note, attachments)


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Note.objects.prefetch_related('images')
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated, CanEditExperiment]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in ["GET", "HEAD"]:
            permission = CanViewExperiment

        elif self.request.method == "DELETE":
            permission = CanDeleteNotes

        else:
            permission = CanEditNotes
        
        return [IsAuthenticated(), permission()]

    def perform_update(self, serializer):
        attachments = self.request.FILES.getlist('attachments')
        _validate_attachments(attachments, existing=serializer.instance.attachments.count())
        note = serializer.save()
        _attach_images(note, self.request.FILES.getlist('images'))
        _attach_files(note, attachments)


class NoteImageDestroyView(generics.DestroyAPIView):
    queryset = NoteImage.objects.select_related('note__experiment')
    serializer_class = NoteImageSerializer
    permission_classes = [IsAuthenticated, CanDeleteNotes]


class NoteImageContentView(APIView):
    permission_classes = [IsAuthenticated, CanViewExperiment]

    def get(self, request, pk):
        image = get_object_or_404(
            NoteImage.objects.select_related('note__experiment'),
            pk=pk,
        )
        self.check_object_permissions(request, image)

        content_type, _ = mimetypes.guess_type(image.image.name)
        if settings.DEBUG:
            return FileResponse(
                image.image.open('rb'),
                content_type=content_type or 'application/octet-stream',
                as_attachment=False,
                filename=PurePosixPath(image.image.name).name,
            )

        response = HttpResponse(content_type=content_type or 'application/octet-stream')
        response['Content-Disposition'] = (
            f'inline; filename="{PurePosixPath(image.image.name).name}"'
        )
        response['Cache-Control'] = 'private, max-age=300'
        response['X-Accel-Redirect'] = f'/media/{image.image.name}'
        return response


class NoteAttachmentDestroyView(generics.DestroyAPIView):
    queryset = NoteAttachment.objects.select_related('note__experiment')
    serializer_class = NoteAttachmentSerializer
    permission_classes = [IsAuthenticated, CanDeleteNotes]


class NoteAttachmentContentView(APIView):
    permission_classes = [IsAuthenticated, CanViewExperiment]

    def get(self, request, pk):
        attachment = get_object_or_404(
            NoteAttachment.objects.select_related('note__experiment'),
            pk=pk,
        )
        self.check_object_permissions(request, attachment)

        # Always served as a download with a neutral type, so uploaded HTML/SVG
        # files are never rendered in the app's origin.
        if settings.DEBUG:
            return FileResponse(
                attachment.file.open('rb'),
                content_type='application/octet-stream',
                as_attachment=True,
                filename=attachment.original_name,
            )

        response = HttpResponse(content_type='application/octet-stream')
        response['Content-Disposition'] = content_disposition_header(
            as_attachment=True,
            filename=attachment.original_name,
        )
        response['Cache-Control'] = 'private, max-age=300'
        response['X-Accel-Redirect'] = f'/media/{attachment.file.name}'
        return response


class ExperimentBBCHObservationListCreateView(generics.ListCreateAPIView):
    serializer_class = BBCHObservationSerializer

    def get_permissions(self):
        permission = (
            CanViewExperiment
            if self.request.method in ['GET', 'HEAD']
            else IsExperimentOwnerOrCollaborator
        )
        return [IsAuthenticated(), permission()]

    def get_experiment(self):
        if not hasattr(self, '_experiment'):
            self._experiment = get_object_or_404(Experiment, pk=self.kwargs['pk'])
            self.check_object_permissions(self.request, self._experiment)
        return self._experiment

    def get_queryset(self):
        return BBCHObservation.objects.filter(experiment_id=self.kwargs['pk'])

    def list(self, request, *args, **kwargs):
        self.get_experiment()
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(experiment=self.get_experiment(), author=self.request.user)


def _attach_images(note, files):
    if not files:
        return
    allowed = MAX_IMAGES_PER_NOTE - note.images.count()
    for image in files[:max(allowed, 0)]:
        NoteImage.objects.create(note=note, image=image)


def _validate_attachments(files, existing=0):
    if existing + len(files) > MAX_ATTACHMENTS_PER_NOTE:
        raise ValidationError({
            'attachments': f'A note can have at most {MAX_ATTACHMENTS_PER_NOTE} files.',
        })
    for file in files:
        if PurePosixPath(file.name).suffix.lower() not in ALLOWED_ATTACHMENT_EXTENSIONS:
            raise ValidationError({
                'attachments': (
                    f'"{file.name}" has an unsupported type. Allowed: '
                    f'{", ".join(ext[1:].upper() for ext in ALLOWED_ATTACHMENT_EXTENSIONS)}.'
                ),
            })
        if file.size == 0:
            raise ValidationError({'attachments': f'"{file.name}" is empty.'})
        if file.size > MAX_ATTACHMENT_SIZE:
            raise ValidationError({
                'attachments': f'"{file.name}" is larger than {MAX_ATTACHMENT_SIZE // (1024 * 1024)} MB.',
            })
        if not _content_matches_extension(file):
            raise ValidationError({
                'attachments': f'"{file.name}" content does not match its file type.',
            })


def _content_matches_extension(file):
    """Rejects renamed files, e.g. a video saved as .pdf."""
    suffix = PurePosixPath(file.name).suffix.lower()
    file.seek(0)
    head = file.read(8192)
    file.seek(0)
    if suffix == '.pdf':
        return head.startswith(b'%PDF-')
    if suffix in ('.docx', '.xlsx'):
        return head.startswith(_ZIP_SIGNATURE)
    # .txt / .csv: plain text, no binary NUL bytes
    return b'\x00' not in head


def _attach_files(note, files):
    for file in files:
        NoteAttachment.objects.create(
            note=note,
            file=file,
            original_name=PurePosixPath(file.name).name[:255] or 'file',
            size=file.size,
        )

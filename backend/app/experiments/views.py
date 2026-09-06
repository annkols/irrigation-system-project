from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Experiment, ExperimentCollaborator
from .serializers import (
    ALLOWED_SENSOR_FREQUENCY_KEYS,
    ExperimentSerializer,
    ExperimentWithMeasurementsSerializer,
    ExperimentUpdateSerializer,
    ExperimentCollaboratorSerializer,
    ExperimentCollaboratorPermissionSerializer,
)

from .permissions import (
    CanEditExperiment,
    CanEndExperiment,
    CanViewExperiment,
    IsExperimentOwner,
    IsExperimentOwnerOrCollaborator,
)

# Create your views here.
class ExperimentListCreateView(generics.ListCreateAPIView):
    queryset = Experiment.objects.all().order_by('-created_at')
    serializer_class = ExperimentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PublicExperimentSearchView(generics.ListAPIView):
    serializer_class = ExperimentSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        queryset = Experiment.objects.filter(is_public=True).order_by('-created_at')
        search = self.request.query_params.get('search', '').strip()
        keyword_param = self.request.query_params.get('keywords', '')
        keywords = [
            " ".join(value.split()).casefold()
            for value in keyword_param.split(',')
            if value.strip()
        ]

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(plant_name__icontains=search)
                | Q(keywords__name__icontains=search)
            )

        if keywords:
            queryset = queryset.filter(keywords__name__in=keywords)

        return queryset.distinct()


class ExperimentDetailView(generics.RetrieveAPIView):
    queryset = Experiment.objects.all()
    serializer_class = ExperimentSerializer
    permission_classes = [CanViewExperiment]


class ExperimentStatusListView(generics.ListAPIView):
    serializer_class = ExperimentSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        status = self.kwargs['status']

        if status == 'not-started':
            return Experiment.objects.filter(
                started_at__isnull=True,
                finished_at__isnull=True
            ).order_by('-created_at')

        if status == 'in-progress':
            return Experiment.objects.filter(
                started_at__isnull=False,
                finished_at__isnull=True
            ).order_by('-created_at')

        if status == 'completed':
            return Experiment.objects.filter(
                finished_at__isnull=False
            ).order_by('-created_at')

        raise ValidationError({
            "status": "Wybierz z dostępnych statusów: not-started, in-progress, completed."
        })
    
class ExperimentUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Experiment.objects.all()
    serializer_class = ExperimentUpdateSerializer
    queryset = Experiment.objects.all()
    serializer_class = ExperimentUpdateSerializer

    permission_classes = [
        IsAuthenticated,
        CanEditExperiment,
    ]


class ExperimentDeleteView(generics.DestroyAPIView):
    queryset = Experiment.objects.all()
    permission_classes = [
        IsAuthenticated,
        IsExperimentOwner
    ]


class ExperimentEndView(APIView):
    permission_classes = [
        IsAuthenticated,
        CanEndExperiment
    ]

    def post(self, request, pk):
        experiment = get_object_or_404(Experiment, pk=pk)

        self.check_object_permissions(request, experiment)

        if experiment.finished_at is not None:
            return Response(
                {"detail": "Eksperyment został już zakończony."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if experiment.started_at is None:
            return Response(
                {"detail": "Nie można zakończyć nierozpoczętego eksperymentu."},
                status=status.HTTP_400_BAD_REQUEST
            )

        experiment.finished_at = timezone.now()
        experiment.save(update_fields=["finished_at"])

        serializer = ExperimentSerializer(experiment, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class ActiveExperimentSensorConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        sensor_set_id = request.query_params.get('sensor_set_id', 1)

        experiment = (
            Experiment.objects
            .filter(sensor_set_id=sensor_set_id, finished_at__isnull=True)
            .order_by('-created_at')
            .first()
        )

        if not experiment:
            return Response(
                {"detail": "Brak aktywnego eksperymentu dla tego zestawu czujnikow."},
                status=status.HTTP_404_NOT_FOUND
            )

        frequencies = {
            key: 0
            for key in ALLOWED_SENSOR_FREQUENCY_KEYS
        }

        if experiment.sensor_frequencies:
            frequencies.update(experiment.sensor_frequencies)
        else:
            default_frequency = experiment.measurement_frequency_seconds
            frequencies = {
                key: default_frequency
                for key in ALLOWED_SENSOR_FREQUENCY_KEYS
            }

        if not frequencies.get("soil_moisture"):
            frequencies["soil_moisture"] = experiment.measurement_frequency_seconds

        return Response({
            "experiment_id": experiment.id,
            "sensor_set_id": experiment.sensor_set_id,
            "sensor_frequencies": frequencies,
        })


class ExperimentWithMeasurementsListView(generics.ListAPIView):
    serializer_class = ExperimentWithMeasurementsSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        return Experiment.objects.all().order_by('-created_at')


class ExperimentWithMeasurementsDetailView(generics.RetrieveAPIView):
    serializer_class = ExperimentWithMeasurementsSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        return Experiment.objects.all()

    # READ COLABORATORS DLA DANEGO EKSPERYMENTU
class ExperimentCollaboratorsListView(generics.ListCreateAPIView):
    serializer_class = ExperimentCollaboratorSerializer

    def get_experiment(self):
        return get_object_or_404(
            Experiment,
            pk=self.kwargs["pk"],
        )

    def get_permissions(self):
        permission_classes = [IsAuthenticated]

        if self.request.method == "GET":
            permission_classes.append(
                IsExperimentOwnerOrCollaborator
            )
        else:
            permission_classes.append(
                IsExperimentOwner
            )

        return [
            permission()
            for permission in permission_classes
        ]

    def get_queryset(self):
        experiment = self.get_experiment()

        self.check_object_permissions(
            self.request,
            experiment,
        )

        return (
            ExperimentCollaborator.objects
            .filter(experiment=experiment)
            .select_related(
                "user",
                "user__profile",
            )
            .order_by("user__username")
        )

    def perform_create(self, serializer):
        with transaction.atomic():
            experiment = get_object_or_404(
                Experiment.objects.select_for_update(),
                pk=self.kwargs["pk"],
)
            self.check_object_permissions(
                self.request,
                experiment,
            )

            user = serializer.validated_data["user"]

            if user.id == experiment.owner_id:
                raise ValidationError({
                    "user_id":
                    "Właściciel nie może zostać współpracownikiem."
                })

            if ExperimentCollaborator.objects.filter(
                experiment=experiment,
                user=user,
            ).exists():
                raise ValidationError({
                    "user_id":
                    "Ten użytkownik jest już współpracownikiem."
                })

            if experiment.collaborator_memberships.count() >= 50:
                raise ValidationError({
                    "collaborators":
                    "Eksperyment może mieć maksymalnie 50 współpracowników."
                })

            serializer.save(
                experiment=experiment,
            )

class ExperimentCollaboratorDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [
        IsAuthenticated,
        IsExperimentOwner,
    ]

    lookup_url_kwarg = "membership_pk"

    http_method_names = [
        "get",
        "patch",
        "delete",
        "head",
        "options",
    ]

    def get_queryset(self):
        return (
            ExperimentCollaborator.objects
            .filter(
                experiment_id=self.kwargs["pk"]
            )
            .select_related(
                "experiment",
                "user",
                "user__profile",
            )
        )

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return ExperimentCollaboratorPermissionSerializer

        return ExperimentCollaboratorSerializer
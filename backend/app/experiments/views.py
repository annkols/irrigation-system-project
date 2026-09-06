from itertools import product

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from camera_frames.models import CameraDevice

from .models import (
    Experiment,
    ExperimentCollaborator,
    ExperimentCameraAssignment,
    ExperimentalFactor,
    FactorLevel,
    Pot,
    PotHardwareAssignment,
    Treatment,
    TreatmentFactorLevel,
)
from .serializers import (
    ALLOWED_SENSOR_FREQUENCY_KEYS,
    ExperimentSerializer,
    ExperimentWithMeasurementsSerializer,
    ExperimentDesignReadSerializer,
    ExperimentDesignWriteSerializer,
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
    queryset = Experiment.objects.prefetch_related('pots').all().order_by('-created_at')
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


class ExperimentDesignView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        permissions = [IsAuthenticated]
        permissions.append(CanViewExperiment if self.request.method == "GET" else CanEditExperiment)
        return [permission() for permission in permissions]

    def get_experiment(self, pk):
        try:
            return Experiment.objects.prefetch_related(
                "factors__levels",
                "treatments__levels",
                "pots__hardware_assignments",
                "camera_assignments__camera",
                "camera_assignments__pot",
            ).get(pk=pk)
        except Experiment.DoesNotExist:
            return None

    def get(self, request, pk):
        experiment = self.get_experiment(pk)
        if not experiment:
            return Response({"detail": "Nie znaleziono eksperymentu."}, status=404)
        self.check_object_permissions(request, experiment)
        return Response(ExperimentDesignReadSerializer(experiment).data)

    @transaction.atomic
    def put(self, request, pk):
        experiment = self.get_experiment(pk)
        if not experiment:
            return Response({"detail": "Nie znaleziono eksperymentu."}, status=404)
        self.check_object_permissions(request, experiment)

        serializer = ExperimentDesignWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        factor_definitions = data["factors"]
        repetitions = data["repetitions"]
        possible_pot_count = repetitions
        for factor in factor_definitions:
            possible_pot_count *= len(factor["levels"])
        if possible_pot_count > 500:
            raise ValidationError({
                "factors": "Plan może zawierać maksymalnie 500 doniczek."
            })

        # Projekt można zapisać ponownie przed rozpoczęciem doświadczenia.
        # Usuwamy wyłącznie jego plan; sam eksperyment i dane opisowe pozostają.
        experiment.treatments.all().delete()
        experiment.factors.all().delete()

        ordered_levels = []
        for factor_position, factor_data in enumerate(factor_definitions, start=1):
            factor = ExperimentalFactor.objects.create(
                experiment=experiment,
                name=factor_data["name"].strip(),
                unit=factor_data.get("unit", "").strip(),
                position=factor_position,
            )
            factor_levels = []
            for level_position, level_data in enumerate(factor_data["levels"], start=1):
                level = FactorLevel.objects.create(
                    factor=factor,
                    label=level_data["label"].strip(),
                    value=level_data.get("value", "").strip(),
                    is_reference=level_data.get("is_reference", False),
                    position=level_position,
                )
                factor_levels.append(level)
            ordered_levels.append(factor_levels)

        combinations = list(product(*ordered_levels))
        selected = data.get("selected_combinations")
        if selected is not None:
            selected_keys = {
                tuple(
                    combination.get(factor["name"], "").strip().casefold()
                    for factor in factor_definitions
                )
                for combination in selected
            }
            invalid = [key for key in selected_keys if "" in key]
            available_keys = {
                tuple(level.label.casefold() for level in combination)
                for combination in combinations
            }
            if invalid or not selected_keys.issubset(available_keys):
                raise ValidationError({
                    "selected_combinations": "Wybrano nieistniejącą kombinację poziomów."
                })
            combinations = [
                combination
                for combination in combinations
                if tuple(level.label.casefold() for level in combination) in selected_keys
            ]

        if not combinations:
            raise ValidationError({
                "selected_combinations": "Wybierz co najmniej jedną kombinację."
            })

        total_pots = len(combinations) * repetitions
        if total_pots > 500:
            raise ValidationError({"repetitions": "Plan może zawierać maksymalnie 500 doniczek."})

        pots_by_label = {}
        pot_position = 1
        for treatment_position, combination in enumerate(combinations, start=1):
            treatment_name = " | ".join(
                f"{level.factor.name}: {level.label}" for level in combination
            )
            treatment = Treatment.objects.create(
                experiment=experiment,
                name=treatment_name,
                position=treatment_position,
            )
            TreatmentFactorLevel.objects.bulk_create([
                TreatmentFactorLevel(
                    treatment=treatment,
                    factor=level.factor,
                    level=level,
                )
                for level in combination
            ])
            for replicate_number in range(1, repetitions + 1):
                label = f"P{pot_position}"
                pot = Pot.objects.create(
                    experiment=experiment,
                    treatment=treatment,
                    label=label,
                    replicate_number=replicate_number,
                    position=pot_position,
                )
                pots_by_label[label.casefold()] = pot
                pot_position += 1

        used_components = set()
        component_fields = {
            "soil_moisture": PotHardwareAssignment.ComponentType.SOIL_MOISTURE,
            "soil_temperature": PotHardwareAssignment.ComponentType.SOIL_TEMPERATURE,
            "pump": PotHardwareAssignment.ComponentType.PUMP,
        }
        for assignment_data in data.get("pot_assignments", []):
            pot = pots_by_label.get(assignment_data["label"].casefold())
            if not pot:
                raise ValidationError({"pot_assignments": "Przypisano sprzęt do nieistniejącej doniczki."})
            pot.is_monitored = assignment_data.get("is_monitored", False)
            pot.save(update_fields=["is_monitored"])
            for field, component_type in component_fields.items():
                identifier = assignment_data.get(field, "").strip()
                if not identifier:
                    continue
                component_key = (component_type, identifier.casefold())
                if component_key in used_components:
                    raise ValidationError({
                        "pot_assignments": f"Element {identifier} został przypisany więcej niż raz."
                    })
                used_components.add(component_key)
                PotHardwareAssignment.objects.create(
                    pot=pot,
                    component_type=component_type,
                    component_identifier=identifier,
                )

        used_camera_ids = set()
        for assignment_data in data.get("camera_assignments", []):
            camera_id = assignment_data["camera_id"]
            if camera_id in used_camera_ids:
                raise ValidationError({"camera_assignments": "Jedna kamera nie może obserwować dwóch doniczek."})
            used_camera_ids.add(camera_id)
            pot = pots_by_label.get(assignment_data["pot_label"].casefold())
            if not pot:
                raise ValidationError({"camera_assignments": "Przypisano kamerę do nieistniejącej doniczki."})
            try:
                camera = CameraDevice.objects.get(
                    pk=camera_id,
                    sensor_set_id=experiment.sensor_set_id,
                    is_active=True,
                )
            except CameraDevice.DoesNotExist:
                raise ValidationError({
                    "camera_assignments": "Kamera nie istnieje, jest nieaktywna albo należy do innego zestawu."
                })
            ExperimentCameraAssignment.objects.create(
                experiment=experiment,
                pot=pot,
                camera=camera,
            )

        refreshed = self.get_experiment(pk)
        return Response(ExperimentDesignReadSerializer(refreshed).data)


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

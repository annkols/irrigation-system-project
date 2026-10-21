from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from django.db.models import Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
import mimetypes

from experiments.models import Experiment
from .models import DismissedNotification

from datetime import timedelta

from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView
from rest_framework.parsers import FormParser, MultiPartParser

from .permissions import CanViewUsers, CanChangeUsers, IsSuperUser

# Create your views here.
from .serializers import (
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserSearchSerializer,
    UserSerializer,
    ProfilePictureUploadSerializer,
    UserDeleteConfirmSerializer,
    UserEditSerializer
)

from .models import UserProfile

User = get_user_model()

class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [CanViewUsers]

class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [CanViewUsers]


class UserSearchView(generics.ListAPIView):
    serializer_class = UserSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()

        if len(query) < 2:
            raise ValidationError({
                "q": "Wpisz co najmniej 2 znaki, aby wyszukać użytkownika."
            })

        queryset = User.objects.filter(is_active=True).select_related("profile")
        searchable_fields = (
            "username__icontains",
            "first_name__icontains",
            "last_name__icontains",
            "profile__university__icontains",
            "profile__department__icontains",
        )

        for term in query.split():
            term_filter = Q()
            for field in searchable_fields:
                term_filter |= Q(**{field: term})
            queryset = queryset.filter(term_filter)

        return queryset.order_by("first_name", "last_name", "username")[:20]

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        update_last_login(None, user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user, context={"request": request}).data,
        })


class TokenRefreshView(SimpleJWTTokenRefreshView):
    permission_classes = [AllowAny]
    authentication_classes = []


class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        user = self.get_object()

        serializer = UserEditSerializer(
            user,
            data=request.data,
            partial=True,
            context={"request": request}
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            UserSerializer(user, context={"request": request}).data, 
            status=status.HTTP_200_OK
        )

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            refresh = RefreshToken(serializer.validated_data["refresh"])
        except TokenError as error:
            raise ValidationError({"refresh": "Invalid or expired refresh token."}) from error

        if str(refresh.get("user_id")) != str(request.user.pk):
            raise ValidationError({"refresh": "Refresh token does not belong to this user."})

        refresh.blacklist()
        return Response(status=status.HTTP_204_NO_CONTENT)

class UserDeleteView(generics.DestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [IsSuperUser]

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()

        if user.pk == request.user.pk:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)

class UserSelfDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserDeleteConfirmSerializer

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = self.get_object()
        self.perform_destroy(user)

        return Response(
            {"detail": "Your account has been deleted, and your experiments have been preserved."},
            status=status.HTTP_200_OK
        )
    
class UserDeactivateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [CanChangeUsers]

    http_method_names = ["patch", "head", "options"]
    
    def patch(self, request, *args, **kwargs):
        user = self.get_object()

        if ((user.is_staff or user.is_superuser) and not request.user.is_superuser):
            return Response(
                {"detail": "You cannot deactivate admin users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.pk == request.user.pk:
            return Response(
                {"detail": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
    )

        user.is_active = False
        user.save(update_fields=["is_active"])

        return Response({
            "detail": "User has been deactivated.",
            "user": UserSerializer(user, context={"request": request}).data})


class UserActivateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [CanChangeUsers]

    http_method_names = [
        "patch",
        "head",
        "options",
    ]

    def patch(self, request, *args, **kwargs):
        user = self.get_object()

        if ((user.is_staff or user.is_superuser) and not request.user.is_superuser):
            return Response({
                "detail": "Only a superuser can activate an administrator account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user.is_active:
            return Response({"detail": "User is already active."})

        user.is_active = True
        user.save(update_fields=["is_active"])

        return Response({
            "detail": "User has been activated.",
            "user": UserSerializer(user, context={"request": request}).data
        })



class CurrentUserProfilePictureView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        if not profile.profile_picture:
            raise Http404("Profile picture not found")

        content_type, _ = mimetypes.guess_type(profile.profile_picture.name)
        try:
            image = profile.profile_picture.open("rb")
        except FileNotFoundError as exc:
            raise Http404("Profile picture not found") from exc

        return FileResponse(
            image,
            content_type=content_type or "application/octet-stream",
            as_attachment=False,
        )

    def patch(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        serializer = ProfilePictureUploadSerializer(profile, data=request.data, context={"request": request})

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            "detail": "Profile picture has been updated",
            "user": UserSerializer(request.user, context={"request": request}).data
            }, status=status.HTTP_200_OK)

    def delete(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        if profile.profile_picture:
            profile.profile_picture.delete(save=False)
            profile.profile_picture = ""
            profile.save(update_fields=["profile_picture"])

        return Response({
            "detail": "Profile picture has been deleted",
            "user": UserSerializer(
                request.user,
                context={"request": request}
            ).data
        }, status=status.HTTP_200_OK)


class UserProfilePictureView(APIView):
    permission_classes = [CanViewUsers]

    def get(self, request, pk):
        user = get_object_or_404(User.objects.select_related("profile"), pk=pk)
        try:
            profile = user.profile
        except UserProfile.DoesNotExist as exc:
            raise Http404("Profile picture not found") from exc

        if not profile.profile_picture:
            raise Http404("Profile picture not found")

        content_type, _ = mimetypes.guess_type(profile.profile_picture.name)
        try:
            image = profile.profile_picture.open("rb")
        except FileNotFoundError as exc:
            raise Http404("Profile picture not found") from exc

        return FileResponse(
            image,
            content_type=content_type or "application/octet-stream",
            as_attachment=False,
        )

class UserNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        notifications = []

        dismissed_ids = set(
            DismissedNotification.objects.filter(user=user)
            .values_list("notification_id", flat=True)
        )

        user_experiments = Experiment.objects.filter(
            Q(owner=user) | Q(collaborator_memberships__user=user)
        ).distinct()

        for exp in user_experiments:
            
            # Koniec eksperymentu (planned_end nadszedł)
            notif_id = f"exp_ended_{exp.id}"
            if exp.planned_end_at and exp.planned_end_at <= now and not exp.finished_at:
                if notif_id not in dismissed_ids:
                    notifications.append({
                        "id": notif_id,
                        "type": "experiment_ended",
                        "experiment_id": exp.id,
                        "params": {"name": exp.name},
                        "created_at": exp.planned_end_at
                    })

            # Błąd od czujników
            is_in_progress = exp.started_at and exp.started_at <= now and not exp.finished_at

            if is_in_progress:
                freq_seconds = getattr(exp, 'measurement_frequency_seconds', 900)
		        # Dopuszczalny bufor: 2x częstotliwość pomiarów, ale nie mniej niż 30 minut
                threshold_seconds = max(freq_seconds * 2, 1800)
                latest_measurement = exp.measurements.first()
                incident_marker = latest_measurement.pk if latest_measurement else "no_measurements"
                sensor_notif_id = f"sensor_error_{exp.id}_{incident_marker}"
                
                has_sensor_error = False
                if not latest_measurement:
                    if (now - exp.started_at).total_seconds() > threshold_seconds:
                        has_sensor_error = True
                else:
                    if (now - latest_measurement.created_at).total_seconds() > threshold_seconds:
                        has_sensor_error = True

                if has_sensor_error and sensor_notif_id not in dismissed_ids:
                    notifications.append({
                        "id": sensor_notif_id,
                        "type": "sensor_error",
                        "experiment_id": exp.id,
                        "params": {"name": exp.name},
                        "created_at": latest_measurement.created_at if latest_measurement else exp.started_at
                    })

            # 24h przed planowanym rozpoczęciem
            if exp.planned_start_at:
                start_warning_time = exp.planned_start_at - timedelta(hours=24)
                start_notif_id = f"exp_starting_soon_{exp.id}"
            
                if start_warning_time <= now and (not exp.started_at or exp.started_at > now):
                    if start_notif_id not in dismissed_ids:
                        notifications.append({
                            "id": start_notif_id,
                            "type": "experiment_starting_soon",
                            "experiment_id": exp.id,
                            "params": {"name": exp.name},
                            "created_at": start_warning_time
                        })

            # 24h przed planowanym końcem
            if exp.planned_end_at:
                end_warning_time = exp.planned_end_at - timedelta(hours=24)
                end_notif_id = f"exp_ending_soon_{exp.id}"
            
                if end_warning_time <= now and not exp.finished_at:
                    if end_notif_id not in dismissed_ids:
                        notifications.append({
                            "id": end_notif_id,
                            "type": "experiment_ending_soon",
                            "experiment_id": exp.id,
                            "params": {"name": exp.name},
                            "created_at": end_warning_time
                        })

            # Moment rozpoczęcia eksperymentu
            if exp.started_at and exp.started_at <= now:
                start_notif_id = f"exp_started_{exp.id}"
                if start_notif_id not in dismissed_ids:
                    notifications.append({
                        "id": start_notif_id,
                        "type": "experiment_started",
                        "experiment_id": exp.id,
                        "params": {"name": exp.name},
                        "created_at": exp.started_at
                    })

            # enomalie w pomianrach
            if is_in_progress:
                latest_meas = exp.measurements.first()
                if latest_meas:
                    # trzeba zdefiniować jakiepomiary są normalne
                    thresholds = {
                        "air_temperature": {"max": 45.0, "min": 5.0, "key": "air_temperature"},
                        "soil_temperature": {"max": 45.0, "min": 5.0, "key": "soil_temperature"},
                        "air_humidity": {"max": 80.0, "min": 5.0, "key": "air_humidity"},
                        "moisture_percent": {"max": 90.0, "min": 2.0, "key": "soil_moisture"},
                        "pressure_hpa": {"max": 1050.0, "min": 1000.0, "key": "pressure"}
                    }

                    checks = [
                        ("air_temperature", latest_meas.air_temperature),
                        ("soil_temperature", latest_meas.soil_temperature),
                        ("air_humidity", latest_meas.air_humidity),
                        ("moisture_percent", latest_meas.moisture_percent),
                        ("pressure_hpa", latest_meas.pressure_hpa),
                    ]

                    for field_key, value in checks:
                        if value is None:
                            continue
                    
                        cfg = thresholds.get(field_key)
                        if not cfg:
                            continue

                        is_anomaly = False
                        condition_type = ""

                        if "max" in cfg and value > cfg["max"]:
                            is_anomaly = True
                            condition_type = "max"
                        elif "min" in cfg and value < cfg["min"]:
                            is_anomaly = True
                            condition_type = "min"

                        if is_anomaly:
                            anomaly_notif_id = f"anomaly_{exp.id}_{field_key}_{latest_meas.pk}"
                            if anomaly_notif_id not in dismissed_ids:
                                notifications.append({
                                    "id": anomaly_notif_id,
                                    "type": "measurement_anomaly",
                                    "experiment_id": exp.id,
                                    "params": {
                                        "name": exp.name,
                                        "metric_key": cfg["key"],
                                        "value": value,
                                        "limit": cfg[condition_type],
                                        "condition": condition_type
                                    },
                                    "created_at": latest_meas.created_at
                                })


            # POTENCJALNEI DODATKOWE POWIADOMIENIA (TODO):
            # Dodano użytkownika jako collabolator
            # Błąd od kamery


        return Response(notifications)

class DismissNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notification_id = request.data.get("notification_id")
        if not notification_id:
            return Response({"detail": "notification_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        DismissedNotification.objects.get_or_create(
            user=request.user,
            notification_id=notification_id
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

from django.contrib.auth import get_user_model
from django.contrib.auth.models import update_last_login
from django.db.models import Q

from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView

from .permissions import CanViewUsers, CanChangeUsers, IsSuperUser

# Create your views here.
from .serializers import (
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserSearchSerializer,
    UserSerializer,
)

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

    def get_object(self):
        return self.request.user


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

    
class UserDeactivateView(generics.UpdateAPIView):
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



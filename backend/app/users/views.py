from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework import generics, status
from rest_framework.response import Response


# Create your views here.
from .serializers import UserSerializer, RegisterSerializer
from .permissions import IsSuperUser

User = get_user_model()

class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

class UserDeleteView(generics.DestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [IsSuperUser]

class UserDeactivateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAdminUser]

    def patch(self, request, *args, **kwargs):
        user = self.get_object()

        if user.is_staff or user.is_superuser:
            return Response(
                {"detail": "You cannot deactivate admin users."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user.is_active = False
        user.save(update_fields=["is_active"])

        return Response({"detail": "User has been deactivated."})



from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import UserProfile

from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType


User = get_user_model()


class UserViewTests(APITestCase):

    def setUp(self):
        # REGULAR USER
        self.regular_user = User.objects.create_user(
            username="viewing.user",
            email="view@example.com",
            password="ViewPass123!",
            is_active=True,
            is_staff=False,
            is_superuser=False,
        )

        # USER VIEWED
        self.anna = User.objects.create_user(
            username="anna.kowalska",
            email="anna.private@example.com",
            password="ViewPass123!",
            first_name="Anna",
            last_name="Kowalska",
            is_active=True,
        )

        UserProfile.objects.create(
            user=self.anna,
            university="Uniwersytet Przyrodniczy w Poznaniu",
            department="Katedra Agronomii",
            role="academic_employee",
        )

        # STAFF
        self.staff = User.objects.create_user(
            username="staff.no.permission",
            email="staff-no-permission@example.com",
            password="StaffPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        # SUPERUSER
        self.superuser = User.objects.create_superuser(
            username="superuser",
            email="superuser@example.com",
            password="SuperPass123!",
        )

    def authenticate(self, user):
        access = RefreshToken.for_user(user).access_token
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access}"
        )

    # ANONYMOUS CANNOT VIEW USER -> 401
    def test_view_requires_authentication(self):
        response = self.client.get(reverse("user-detail", args=[self.anna.pk]))

        self.assertEqual(response.status_code,status.HTTP_401_UNAUTHORIZED,)

    # REGULAR AUTHENTICATED USER CANNOT VIEW USER -> 403
    def test_regular_user_cannot_view_user(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("user-detail", args=[self.anna.pk]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # STAFF WITHOUT VIEW PERMISSION CANNOT VIEW USER -> 403
    def test_staff_without_permission_cannot_view_user(self):
        self.authenticate(self.staff)

        response = self.client.get(reverse("user-detail", args=[self.anna.pk]))

        self.assertEqual(response.status_code,status.HTTP_403_FORBIDDEN,)

    # STAFF WITH VIEW PERMISSION CAN VIEW USER -> 200
    def test_staff_with_permission_can_view_user(self):
        self.authenticate(self.staff)

        content_type = ContentType.objects.get_for_model(User)

        view_user_permission = Permission.objects.get(
            content_type=content_type,
            codename=f"view_{User._meta.model_name}",
        )

        self.staff.user_permissions.add(view_user_permission)

        response = self.client.get(reverse("user-detail", args=[self.anna.pk]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.anna.pk)

    # SUPERUSER CAN VIEW USER -> 200
    def test_superuser_can_view_user(self):
        self.authenticate(self.superuser)

        response = self.client.get(reverse("user-detail", args=[self.anna.pk]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(response.data["id"], self.anna.pk,)
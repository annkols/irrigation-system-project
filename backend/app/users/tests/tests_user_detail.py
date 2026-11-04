from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import UserProfile

from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

class UserViewTests(APITestCase):

    def setUp(self):

        self.viewer = User.objects.create_user(
            username="viewing.user",
            email="view@example.com",
            password="ViewPass123!",
            is_active=True,
            is_staff=False,
            is_superuser=False
        )

        self.viewed = User.objects.create_user(
            username="anna.kowalska",
            email="anna.private@example.com",
            password="ViewPass123!",
            first_name="Anna",
            last_name="Kowalska",
            is_active=True,
            is_staff=False,
            is_superuser=False
        )

        UserProfile.objects.create(
            user=self.viewed,
            university="Uniwersytet Przyrodniczy w Poznaniu",
            department="Katedra Agronomii",
            role="academic_employee",
        )

        self.staff = User.objects.create_user(
            username="staff.no.permission",
            email="staff-no-permission@example.com",
            password="StaffPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        self.superuser = User.objects.create_superuser(
            username="superuser",
            email="superuser@example.com",
            password="SuperPass123!",
        )


    def authenticate(self, user):

        access = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")


    def test_view_requires_authentication(self):

        response = self.client.get(reverse("user-detail", args=[self.viewed.pk]))

        self.assertEqual(response.status_code,status.HTTP_401_UNAUTHORIZED,)


    def test_active_user_can_view_user(self):

        self.authenticate(self.viewer)

        response = self.client.get(reverse("user-detail", args=[self.viewed.pk]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.viewed.pk)

    def test_inactive_user_cannot_view_user(self):
        self.viewer.is_active = False
        self.viewer.save(update_fields=["is_active"])

        self.authenticate(self.viewer)

        response = self.client.get(reverse("user-detail", args=[self.viewed.pk]))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_staff_without_permission_can_view_user(self):
        
        self.authenticate(self.staff)

        response = self.client.get(reverse("user-detail", args=[self.viewed.pk]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.viewed.pk)


    def test_superuser_can_view_user(self):

        self.authenticate(self.superuser)

        response = self.client.get(reverse("user-detail", args=[self.viewed.pk]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.viewed.pk)

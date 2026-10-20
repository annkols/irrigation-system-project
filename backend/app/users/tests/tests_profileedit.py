from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from PIL import Image

from rest_framework import status
from rest_framework.test import APITestCase

from users.models import UserProfile

User = get_user_model()

class UserProfileEditTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="test.user",
            email="test@example.com",
            password="Z9!vQ2#pL7@xpass",
            first_name="Test",
            last_name="User",
            is_active=True,
        )

        self.profile = UserProfile.objects.create(
            user=self.user,
            university="UPP",
            department="Agronomy",
            role="student",
        )

        self.url = reverse("auth-me")

    # LOGGED IN USER CAN EDIT USERNAME -> 200
    def test_authenticated_user_can_edit_username(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url,
            {"username": "test.user.changed"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "test.user.changed")


    # LOGGED IN USER CAN EDIT FIRST AND LAST NAME -> 200
    def test_authenticated_user_can_edit_first_and_last_name(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url,
            {
                "first_name": "Anna",
                "last_name": "Nowak"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Anna")
        self.assertEqual(self.user.last_name, "Nowak")


    # LOGGED IN USER CAN EDIT PROFILE INFORMATION -> 200
    def test_authenticated_user_can_edit_profile(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url,
            {
                "profile": {
                    "university": "UAM",
                    "department": "WMI",
                }
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.university, "UAM")
        self.assertEqual(self.profile.department, "WMI")
        self.assertEqual(self.profile.role, "student")

    # ANONYMOUS USER CANNOT EDIT PROFILE -> 401
    def test_unauthenticated_user_cannot_edit_profile(self):

        self.client.force_authenticate(user=None)
        response = self.client.patch(
            self.url,
            {"first_name": "Anna"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Test")


    # USER CANNOT CHANGE EMAIL -> 200
    def test_user_cannot_edit_email(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url,
            {"email": "changedtest@example.com"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "test@example.com")


    # USER CANNOT CHANGE ADMIN PERMISSIONS -> 200
    def test_user_cannot_edit_admin_fields(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url,
            {
                "is_staff": True,
                "is_superuser": True,
                "is_active": False
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)
        self.assertTrue(self.user.is_active)


    # USER CANNOT CHANGE AVATAR THROUGH PROFILE EDIT -> 200
    def test_user_cannot_edit_profile_picture(self):

        self.client.force_authenticate(user=self.user)
        self.profile.profile_picture = "profile_pictures/old.jpg"
        self.profile.save(update_fields=["profile_picture"])

        response = self.client.patch(
            self.url,
            {
                "profile": {
                    "profile_picture": "profile_pictures/new.jpg"
                }
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.profile_picture.name, "profile_pictures/old.jpg")

    # USER CANNOT CHANGE AVATAR THROUGH PROFILE EDIT -> 400
    def test_user_cannot_update_data_if_field_is_invalid(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url,
            {
                "first_name": "Anna",
                "profile": {
                    "role": "fake role"
                }

            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Test")
        self.assertEqual(self.profile.role, "student")
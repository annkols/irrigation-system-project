from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import UserProfile

from django.contrib.auth import get_user_model
from django.urls import reverse

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


    def authenticate(self, user):

        access = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")


    def test_authenticated_user_can_edit_username(self):

        self.authenticate(self.user)

        response = self.client.patch(
            self.url,
            {
                "username": "anna.nowak"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "anna.nowak")


    def test_authenticated_user_can_edit_first_and_last_name(self):

        self.authenticate(self.user)

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


    def test_active_user_can_edit_profile(self):

        self.authenticate(self.user)

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

        self.user.refresh_from_db()
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.university, "UAM")
        self.assertEqual(self.profile.department, "WMI")
        self.assertEqual(self.profile.role, "student")


    def test_anonymous_user_cannot_edit_profile(self):

        response = self.client.patch(
            self.url,
            {
                "first_name": "Anna"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Test")


    def test_inactive_user_cannot_edit_profile(self):

        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        self.authenticate(self.user)

        response = self.client.patch(
            self.url,
            {
                "first_name": "Anna"
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Test")


    def test_user_cannot_edit_email(self):

        self.authenticate(self.user)

        response = self.client.patch(
            self.url,
            {
                "email": "anna.nowak@example.com"
            },
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "test@example.com")


    def test_user_cannot_edit_admin_fields(self):

        self.authenticate(self.user)

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


    def test_user_cannot_edit_profile_picture(self):

        self.authenticate(self.user)

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


    def test_user_cannot_update_data_if_any_field_is_invalid(self):

        self.authenticate(self.user)

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
        self.profile.refresh_from_db()  
        self.assertEqual(self.user.first_name, "Test")
        self.assertEqual(self.profile.role, "student")


    def test_user_cannot_set_empty_username(self):
        
        self.authenticate(self.user)

        response = self.client.patch(
            self.url,
            {
                "username": "   "
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "test.user")


    def test_user_cannot_set_empty_first_name(self):

        self.authenticate(self.user)

        response = self.client.patch(
            self.url,
            {
                "first_name": "   "
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", response.data)

        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Test")


    def test_user_cannot_set_empty_last_name(self):

        self.authenticate(self.user)

        response = self.client.patch(
            self.url,
            {
                "last_name": "   "
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("last_name", response.data)

        self.user.refresh_from_db()
        self.assertEqual(self.user.last_name, "User")
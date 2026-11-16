from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import UserProfile

from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

class UserAuthenticationTests(APITestCase):
    
    def setUp(self):
        
        self.user = User.objects.create_user(
            username="active.user",
            email="active@example.com",
            password="Z9!vQ2#pL7@xpass",
            first_name="Active",
            last_name="User",
            is_active=True,
        )

        UserProfile.objects.create(
            user=self.user,
            university="UPP",
            department="Agronomy",
            role="student",
        )
    
    def login(self):

        return self.client.post(
            reverse("auth-login"),
            {
                "email": "ACTIVE@example.com", 
                "password": "Z9!vQ2#pL7@xpass"
            },
            format="json",
        )


    def authenticate(self, user):

        access = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        
    def invalid_login(self):

        return self.client.post(
            reverse("auth-login"),
            {
                "email": "active@example.com",
                "password": "wqerwsdsafa"
            },
            format="json",
        )


    def test_login_returns_tokens_and_user(self):

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "active@example.com")


    def test_login_rejects_invalid_credentials(self):

        response = self.invalid_login()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_login_rejects_inactive_account(self):

        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_anonymous_user_cannot_access_current_user(self):

        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_logged_user_can_access_current_user(self):

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        response_auth = self.client.get(reverse("auth-me"))

        self.assertEqual(response_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(response_auth.data["id"], self.user.pk)


    def test_refresh_rotates_token(self):

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        old_refresh = response.data["refresh"]

        response_refresh = self.client.post(
            reverse("auth-token-refresh"),
            {"refresh": old_refresh},
            format="json",
        )

        self.assertEqual(response_refresh.status_code, status.HTTP_200_OK)
        self.assertIn("access", response_refresh.data)
        self.assertIn("refresh", response_refresh.data)

        self.assertNotEqual(response_refresh.data["refresh"], old_refresh)


    def test_logout_blacklists_refresh_token(self):

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

        old_refresh = response.data["refresh"]

        logout_response = self.client.post(
            reverse("auth-logout"),
            {"refresh": old_refresh},
            format="json",
        )

        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

        rejected_response = self.client.post(
            reverse("auth-token-refresh"),
            {"refresh": old_refresh},
            format="json",
        )

        self.assertEqual(rejected_response.status_code, status.HTTP_401_UNAUTHORIZED)
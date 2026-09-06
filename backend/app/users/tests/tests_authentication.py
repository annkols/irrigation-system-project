from rest_framework import status
from rest_framework.test import APITestCase

from users.models import UserProfile

from django.urls import reverse
from django.contrib.auth import get_user_model

# Create your tests here.
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
            {"email": "ACTIVE@example.com", "password": "Z9!vQ2#pL7@xpass"},
            format="json",
        )


    # CORRECT LOGIN RETURNS JWT TOKENS -> 200
    def test_login_returns_tokens_and_user(self):
        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "active@example.com")


    # INCORRECT LOGIN DATA -> 403
    def test_login_rejects_invalid_credentials(self):
        response = self.client.post(
            reverse("auth-login"),
            {"email": "active@example.com", "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    # INACTIVE USER CANNOT LOG IN -> 403
    def test_login_rejects_inactive_account(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    # CAN VIEW CURRENT USER ONLY WHEN AUTHENTICATED -> 401, 200
    def test_current_user_requires_and_accepts_access_token(self):
        anonymous_response = self.client.get(reverse("auth-me"))
        self.assertEqual(anonymous_response.status_code, status.HTTP_401_UNAUTHORIZED)

        login_response = self.login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.pk)


    # ACCESS TOKENS REFRESH WHEN LOGGED AND VANISH AFTER LOGOUT -> 200, 204, 401
    def test_refresh_rotates_token_and_logout_blacklists_it(self):
        login_response = self.login()
        refresh_response = self.client.post(
            reverse("auth-token-refresh"),
            {"refresh": login_response.data["refresh"]},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)
        self.assertIn("refresh", refresh_response.data)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh_response.data['access']}"
        )
        logout_response = self.client.post(
            reverse("auth-logout"),
            {"refresh": refresh_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

        rejected_refresh = self.client.post(
            reverse("auth-token-refresh"),
            {"refresh": refresh_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(rejected_refresh.status_code, status.HTTP_401_UNAUTHORIZED)
from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from users.models import CustomUserProfile
from rest_framework_simplejwt.tokens import RefreshToken

# Create your tests here.
User = get_user_model()

class UserTests(APITestCase):
    def test_create_user_successfully(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "Anna.Nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "student",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(response.data["username"], "anna.nowak")
        self.assertEqual(response.data["first_name"], "Anna")
        self.assertEqual(response.data["last_name"], "Nowak")
        self.assertNotIn("password", response.data)

        user = User.objects.get(username="anna.nowak")

        self.assertEqual(user.email, "anna.nowak@example.com")
        self.assertFalse(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

        self.assertTrue(
            user.check_password("Z9!vQ2#pL7@xpass")
        )

        profile = CustomUserProfile.objects.get(user=user)

        self.assertEqual(
            profile.university,
            "Warsaw University of Technology",
        )
        self.assertEqual(
            profile.department,
            "Computer Science",
        )
        self.assertEqual(profile.role, "student")

    def test_user_email_must_be_unique(self):
        url = reverse("user-register")

        first_payload = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "student",
        }

        second_payload = {
            "username": "jan.kowalski",
            "email": "anna.nowak@example.com",
            "password": "T8!qR3#mN5@yPass",
            "first_name": "Jan",
            "last_name": "Kowalski",
            "university": "UAM",
            "department": "Computer Science",
            "role": "student",
        }
        first_response = self.client.post(url, first_payload, format="json")

        second_response = self.client.post(url, second_payload, format="json")

        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn("email", second_response.data)

        self.assertEqual(
            User.objects.filter(
                email__iexact="anna.nowak@example.com"
            ).count(),
            1,
        )

        self.assertFalse(
            User.objects.filter(username="jan.kowalski").exists()
        )

    def test_username_cannot_be_empty(self):
        url = reverse("user-register")

        payload = {
            "username": "   ",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "student",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("username", response.data)
        self.assertEqual(User.objects.count(), 0)


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="active.user",
            email="active@example.com",
            password="Z9!vQ2#pL7@xpass",
            first_name="Active",
            last_name="User",
            is_active=True,
        )
        CustomUserProfile.objects.create(
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

    def test_login_returns_tokens_and_user(self):
        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "active@example.com")

    def test_login_rejects_invalid_credentials(self):
        response = self.client.post(
            reverse("auth-login"),
            {"email": "active@example.com", "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_rejects_inactive_account(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_current_user_requires_and_accepts_access_token(self):
        anonymous_response = self.client.get(reverse("auth-me"))
        self.assertEqual(anonymous_response.status_code, status.HTTP_401_UNAUTHORIZED)

        login_response = self.login()
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )
        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.pk)

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

    def test_admin_can_activate_user(self):
        pending_user = User.objects.create_user(
            username="pending.user",
            email="pending@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=False,
        )
        admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="AdminPass123!",
        )
        admin_access = RefreshToken.for_user(admin).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_access}")

        response = self.client.patch(
            reverse("user-activate", args=[pending_user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pending_user.refresh_from_db()
        self.assertTrue(pending_user.is_active)


class UserValidationTests(APITestCase):
    def test_email_cannot_be_empty(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "   ",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "student",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("email", response.data)
        self.assertEqual(User.objects.count(), 0)


    def test_password_cannot_be_empty(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "   ",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "student",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("password", response.data)
        self.assertEqual(User.objects.count(), 0)


    def test_first_name_cannot_be_empty(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "   ",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "student",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("first_name", response.data)
        self.assertEqual(User.objects.count(), 0)


    def test_last_name_cannot_be_empty(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "   ",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "student",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("last_name", response.data)
        self.assertEqual(User.objects.count(), 0)


    def test_university_cannot_be_empty(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "   ",
            "department": "Computer Science",
            "role": "student",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("university", response.data)
        self.assertEqual(User.objects.count(), 0)


    def test_department_cannot_be_empty(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "   ",
            "role": "student",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("department", response.data)
        self.assertEqual(User.objects.count(), 0)


    def test_role_cannot_be_empty(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("role", response.data)
        self.assertEqual(User.objects.count(), 0)

    def test_role_cannot_be_empty(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("role", response.data)
        self.assertEqual(User.objects.count(), 0)

    def test_role_must_be_from_available_choices(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Anna",
            "last_name": "Nowak",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "administrator",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
    
        self.assertIn("role", response.data)
        self.assertEqual(User.objects.count(), 0)

        

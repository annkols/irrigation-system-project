from rest_framework import status
from rest_framework.test import APITestCase

from users.models import UserProfile

from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

class UserRegistrationTests(APITestCase):

    def setUp(self):
        self.url = reverse("user-register")

    def new_payload(self, **overrides):
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

        payload.update(overrides)
        return payload

    def test_create_user_successfully(self):

        response = self.client.post(self.url, self.new_payload(), format="json")

        self.assertEqual(response.status_code,status.HTTP_201_CREATED)

        self.assertEqual(response.data["username"], "anna.nowak")
        self.assertEqual(response.data["first_name"], "Anna")
        self.assertEqual(response.data["last_name"], "Nowak")

        self.assertNotIn("password", response.data)

        user = User.objects.get(username="anna.nowak")

        self.assertEqual(user.email, "anna.nowak@example.com")

        self.assertFalse(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

        self.assertTrue(user.check_password("Z9!vQ2#pL7@xpass"))

        profile = UserProfile.objects.get(user=user)

        self.assertEqual(profile.university, "Warsaw University of Technology")
        self.assertEqual(profile.department, "Computer Science")
        self.assertEqual(profile.role, "student")


    def test_user_email_must_be_unique(self):

        first_response = self.client.post(self.url, self.new_payload(), format="json")
        second_response = self.client.post(self.url, self.new_payload(
            username = "jan.kowalski",
            email = "anna.nowak@example.com",
        ), 
        format="json")

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertIn("email", second_response.data)

        self.assertEqual(User.objects.filter(email__iexact="anna.nowak@example.com").count(), 1)

        self.assertTrue(User.objects.filter(username="anna.nowak").exists())
        self.assertFalse(User.objects.filter(username="jan.kowalski").exists())


    def test_user_username_must_be_unique(self):

        first_response = self.client.post(self.url, self.new_payload(), format="json")
        second_response = self.client.post(self.url, self.new_payload(
            username = "anna.nowak",
            email = "jan.kowalski@example.com",
        ), 
        format="json")

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertIn("username", second_response.data)

        self.assertEqual(User.objects.filter(email__iexact="anna.nowak@example.com").count(), 1)

        self.assertTrue(User.objects.filter(email="anna.nowak@example.com").exists())
        self.assertFalse(User.objects.filter(email="jan.kowalski@example.com").exists())


    def test_username_cannot_be_empty(self):

        response = self.client.post(self.url, self.new_payload(username = "   "), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

        self.assertEqual(User.objects.count(), 0)


    def test_email_cannot_be_empty(self):

        response = self.client.post(self.url, self.new_payload(email="   "), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

        self.assertEqual(User.objects.count(), 0)


    def test_password_cannot_be_empty(self):

        response = self.client.post(self.url, self.new_payload(password="   "), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("password", response.data)


    def test_first_name_cannot_be_empty(self):

        response = self.client.post(self.url, self.new_payload(first_name = "  "), format="json")

        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("first_name", response.data)


    def test_last_name_cannot_be_empty(self):

        response = self.client.post(self.url, self.new_payload(last_name = "  "), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("last_name", response.data)


    def test_university_cannot_be_empty(self):

        response = self.client.post(self.url, self.new_payload(university = "  "), format="json")

        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("university", response.data)


    def test_department_cannot_be_empty(self):

        response = self.client.post(self.url, self.new_payload(department = "  "), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("department", response.data)


    def test_role_cannot_be_empty(self):

        response = self.client.post(self.url, self.new_payload(role = "  "), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("role", response.data)


    def test_role_must_be_from_available_choices(self):
        
        response = self.client.post(self.url, self.new_payload(role = "admin"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("role", response.data)


    def test_email_must_have_valid_format(self):

        response = self.client.post(self.url, self.new_payload(email = "123"), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("email", response.data)


    def test_registration_cannot_inject_privileges(self):

        response = self.client.post(self.url, self.new_payload(            
            is_active=True,
            is_staff=True,
            is_superuser=True
        ), 
        format="json")

        self.assertEqual(response.status_code,status.HTTP_201_CREATED)

        user = User.objects.get(username="anna.nowak")

        self.assertFalse(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)


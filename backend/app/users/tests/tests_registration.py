from rest_framework import status
from rest_framework.test import APITestCase

from users.models import UserProfile

from django.urls import reverse
from django.contrib.auth import get_user_model

# Create your tests here.
User = get_user_model()

class UserRegistrationTests(APITestCase):

    # NEW USER CREATED -> 201
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


    # USER EMAIL NOT UNIQUE -> 201, 400
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

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertIn("email", second_response.data)

        self.assertEqual(User.objects.filter(email__iexact="anna.nowak@example.com").count(), 1)

        self.assertTrue(User.objects.filter(username="anna.nowak").exists())
        self.assertFalse(User.objects.filter(username="jan.kowalski").exists())


    # USERNAME IS EMPTY -> 400
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

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

        self.assertEqual(User.objects.count(), 0)


    # REGISTRATION CANNOT INJECT ADMIN PRIVILEGES -> 201
    def test_registration_cannot_inject_privileges(self):
        url = reverse("user-register")

        payload = {
            "username": "test.user",
            "email": "test@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "first_name": "Test",
            "last_name": "User",
            "university": "Warsaw University of Technology",
            "department": "Computer Science",
            "role": "student",

            "is_active": True,
            "is_staff": True,
            "is_superuser": True,
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        user = User.objects.get(username="test.user")

        self.assertFalse(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
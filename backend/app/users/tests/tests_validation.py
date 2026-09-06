from rest_framework import status
from rest_framework.test import APITestCase

from users.models import UserProfile

from django.urls import reverse
from django.contrib.auth import get_user_model

# Create your tests here.
User = get_user_model()

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

    def test_email_must_have_valid_format(self):
        url = reverse("user-register")

        payload = {
            "username": "anna.nowak",
            "email": "not-an-email",
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
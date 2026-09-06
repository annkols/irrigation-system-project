from rest_framework import status
from rest_framework.test import APITestCase

from users.models import UserProfile

from django.urls import reverse
from django.contrib.auth import get_user_model

# Create your tests here.
User = get_user_model()

class UserSearchTests(APITestCase):
    
    def setUp(self):
        self.requesting_user = User.objects.create_user(
            username="searching.user",
            email="searching@example.com",
            password="SearchPass123!",
            is_active=True,
        )

        self.anna = User.objects.create_user(
            username="anna.kowalska",
            email="anna.private@example.com",
            password="SearchPass123!",
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

        self.inactive_user = User.objects.create_user(
            username="anna.inactive",
            email="inactive@example.com",
            password="SearchPass123!",
            first_name="Anna",
            last_name="Nieaktywna",
            is_active=False,
        )

    # MUST BE LOGGED IN TO SEARCH USERS -> 401
    def test_search_requires_authentication(self):
        response = self.client.get(reverse("user-search"), {"q": "Anna"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    # SEARCH ONLY RETURNS PUBLIC DATA -> 200
    def test_search_returns_active_user_without_private_fields(self):
        self.client.force_authenticate(user=self.requesting_user)

        response = self.client.get(reverse("user-search"), {"q": "Anna Kowalska"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.anna.id)

        self.assertNotIn("is_active", response.data[0])
        self.assertNotIn("is_staff", response.data[0])
        self.assertNotIn("email", response.data[0])


    # SEARCH BY PROFILE FIELDS -> 200, 200
    def test_search_uses_profile_fields_and_hides_inactive_users(self):
        self.client.force_authenticate(user=self.requesting_user)

        response = self.client.get(reverse("user-search"), {"q": "Agronomii"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([user["id"] for user in response.data], [self.anna.id])

        inactive_response = self.client.get(reverse("user-search"), {"q": "Nieaktywna"})
        self.assertEqual(inactive_response.status_code, status.HTTP_200_OK)
        self.assertEqual(inactive_response.data, [])


    # SEARCH HAS LESS THAN TWO CHARACTERS -> 400
    def test_search_requires_at_least_two_characters(self):
        self.client.force_authenticate(user=self.requesting_user)

        response = self.client.get(reverse("user-search"), {"q": "A"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("q", response.data)


    # SEARCH IS EMPTY -> 400
    def test_search_is_empty(self):
        self.client.force_authenticate(user=self.requesting_user)

        response = self.client.get(reverse("user-search"), {"q": "     "})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("q", response.data)

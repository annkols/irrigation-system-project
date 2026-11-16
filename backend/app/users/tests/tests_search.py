from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import UserProfile

from django.urls import reverse
from django.contrib.auth import get_user_model

# Create your tests here.
User = get_user_model()

class UserSearchTests(APITestCase):
    
    def setUp(self):

        self.searching = User.objects.create_user(
            username="searching.user",
            email="searching@example.com",
            password="SearchPass123!",
            is_active=True,
        )

        self.searched = User.objects.create_user(
            username="anna.kowalska",
            email="anna.private@example.com",
            password="SearchPass123!",
            first_name="Anna",
            last_name="Kowalska",
            is_active=True,
        )

        UserProfile.objects.create(
            user=self.searched,
            university="Uniwersytet Przyrodniczy w Poznaniu",
            department="Katedra Agronomii",
            role="academic_employee",
        )


    def authenticate(self, user):

        access = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")


    def test_search_requires_authentication(self):

        response = self.client.get(reverse("user-search"), {"q": "Anna"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_search_returns_active_user_without_private_fields(self):

        self.authenticate(self.searching)

        response = self.client.get(reverse("user-search"), {"q": "Anna Kowalska"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.searched.id)

        self.assertNotIn("is_active", response.data[0])
        self.assertNotIn("is_staff", response.data[0])

        self.assertIn("email", response.data[0])
        self.assertIn("first_name", response.data[0])
        self.assertIn("university", response.data[0]["profile"])

        self.assertEqual(response.data[0]["email"],"anna.private@example.com")


    def test_search_uses_profile_fields_and_hides_inactive_users(self):
        
        self.client.force_authenticate(user=self.searching)

        response = self.client.get(reverse("user-search"), {"q": "Agronomii"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([user["id"] for user in response.data], [self.searched.id])


    def test_search_omits_inactive_users(self):

        self.authenticate(self.searching)

        self.searched.is_active = False
        self.searched.save(update_fields=["is_active"])

        response = self.client.get(reverse("user-search"), {"q": "Anna Kowalska"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])


    def test_search_requires_at_least_two_characters(self):

        self.authenticate(self.searching)

        response = self.client.get(reverse("user-search"), {"q": "A"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("q", response.data)


    def test_search_is_empty(self):

        self.authenticate(self.searching)

        response = self.client.get(reverse("user-search"), {"q": " "})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("q", response.data)

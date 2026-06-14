from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import UserProfile
from .serializers import UserSerializer


class UserSerializerTests(TestCase):
    def test_user_profile_uses_department_field(self):
        user = get_user_model().objects.create_user(
            username="researcher",
            email="researcher@example.com",
            password="password",
        )
        UserProfile.objects.create(
            user=user,
            department="Department of Plant Physiology",
        )

        data = UserSerializer(user).data

        self.assertEqual(
            data["profile"]["department"],
            "Department of Plant Physiology",
        )
        self.assertNotIn("scientific_unit", data["profile"])

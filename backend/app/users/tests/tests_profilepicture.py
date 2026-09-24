from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from PIL import Image

from rest_framework import status
from rest_framework.test import APITestCase

from users.models import UserProfile

User = get_user_model()

def create_test_avatar_file(name="avatar.jpg", image_format="JPEG"):

    file = BytesIO()
    image = Image.new("RGB", (1024, 1024), color="red")
    image.save(file, image_format)
    file.seek(0)

    return SimpleUploadedFile(name, file.read(), content_type="image/jpeg")

class UserProfilePictureTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPass123"
        )

        self.url = reverse("auth-me-avatar")

    # LOGGED IN USER CAN CHANGE AN AVATAR -> 200
    def test_authenticated_user_can_upload_profile_picture(self):
        self.client.force_authenticate(user=self.user)

        image = create_test_avatar_file()

        response = self.client.patch(self.url, {"profile_picture": image}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Profile picture has been updated")

        profile = self.user.profile
        profile.refresh_from_db()

        self.assertTrue(profile.profile_picture)
        self.assertIn("profile_picture", response.data["user"]["profile"])


    # ANONYMOUS TRIES TO UPLOAD AN AVATAR -> 401
    def test_unauthenticated_user_cannot_upload_avatar(self):
        image = create_test_avatar_file()

        response = self.client.patch(self.url, {"profile_picture": image}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
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
    def test_authenticated_user_can_upload_avatar(self):
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


    # LOGGED IN USER CAN DELETE AN AVATAR -> 200
    def test_authenticated_user_can_delete_avatar(self):
        self.client.force_authenticate(user=self.user)

        profile, created = UserProfile.objects.get_or_create(user=self.user)
        profile.profile_picture = create_test_avatar_file()
        profile.save()

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Profile picture has been deleted")

        self.assertFalse(profile.profile_picture)


    # ANONYMOUS TRIES TO DELETE AN AVATAR -> 401
    def test_unauthenticated_user_cannot_delete_avatar(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    # UPLOAD WITHOUT FILE -> 400
    def test_upload_without_file(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(self.url, {}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("profile_picture", response.data)


    # UPLOADING A FILE TOO LARGE -> 400
    def test_upload_a_too_big_file(self):
        self.client.force_authenticate(user=self.user)

        big_file = SimpleUploadedFile("large.jpg", b"a" * (6 * 1024 * 1024), content_type="image/jpeg")

        response = self.client.patch(self.url, {"profile_picture": big_file}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("profile_picture", response.data)

    # UPLOADNIG AN EMPTY EXISTING FILE -> 400
    def test_upload_empty_file(self):
        self.client.force_authenticate(user=self.user)

        empty_file = SimpleUploadedFile("empty.jpg", b"", content_type="image/jpeg")

        response = self.client.patch(self.url, {"profile_picture": empty_file}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("profile_picture", response.data)
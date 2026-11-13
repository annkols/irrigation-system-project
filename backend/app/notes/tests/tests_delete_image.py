import io

from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from PIL import Image

from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment
from notes.models import Note, NoteImage

User = get_user_model()


class NoteImageDeletionTests(APITestCase):

    def setUp(self):

        self.media_root = self.enterContext(TemporaryDirectory())
        self.enterContext(override_settings(MEDIA_ROOT=self.media_root))

        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="Pass123!",
            is_active=True,
        )

        self.stranger = User.objects.create_user(
            username="stranger",
            email="stranger@example.com",
            password="Pass123!",
            is_active=True,
        )

        self.experiment = Experiment.objects.create(
            name="Experiment",
            owner=self.owner,
            sensor_set_id=1,
        )

        self.note = Note.objects.create(
            experiment=self.experiment,
            title="Note",
            content="Note body",
            author=self.owner,
        )

        self.image = NoteImage.objects.create(
            note=self.note,
            image=self.make_image("test.png"),
        )

        self.url = f"/api/note-images/{self.image.pk}/"


    def make_image(self, name="test.png"):

        buffer = io.BytesIO()
        Image.new("RGB", (10, 10), "green").save(buffer, format="PNG")

        return SimpleUploadedFile(
            name,
            buffer.getvalue(),
            content_type="image/png",
        )


    def test_delete_single_image(self):

        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(NoteImage.objects.filter(pk=self.image.pk).exists())

    def test_unautheticated_cannot_delete_image(self):

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.assertTrue(NoteImage.objects.filter(pk=self.image.pk).exists())


    def test_stranger_cannot_delete_image(self):

        self.client.force_authenticate(user=self.stranger)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.assertTrue( NoteImage.objects.filter(pk=self.image.pk).exists())
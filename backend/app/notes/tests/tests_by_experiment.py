import io

from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from PIL import Image

from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment, ExperimentCollaborator
from notes.models import Note

User = get_user_model()


class ExperimentNotesTests(APITestCase):

    def setUp(self):

        self.media_root = self.enterContext(TemporaryDirectory())
        self.enterContext(override_settings(MEDIA_ROOT=self.media_root))

        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="Pass123!",
            is_active=True,
        )

        self.experiment = Experiment.objects.create(
            name="Experiment",
            owner=self.owner,
            sensor_set_id=1,
        )

        self.url = f"/api/experiments/{self.experiment.pk}/notes/"


    def make_image(self, name="test.png"):

        buffer = io.BytesIO()
        Image.new("RGB", (10, 10), "green").save(buffer, format="PNG")

        return SimpleUploadedFile(
            name,
            buffer.getvalue(),
            content_type="image/png",
        )


    def test_anonymous_cannot_list_notes(self):

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_add_multiple_images_on_create(self):

        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.url,
            {"title": "With images",
                "images": [
                    self.make_image("a.png"),
                    self.make_image("b.png"),
                ],
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["images"]), 2)

        note = Note.objects.get(pk=response.data["id"])

        self.assertEqual(note.author, self.owner)
        self.assertEqual(note.experiment, self.experiment)
        self.assertEqual(note.images.count(), 2)

    def test_collaborator_can_create_note(self):
        collaborator = User.objects.create_user(
            username="collaborator",
            email="collaborator@example.com",
            password="Pass123!",
            is_active=True,
        )
        ExperimentCollaborator.objects.create(
            experiment=self.experiment,
            user=collaborator,
        )
        self.client.force_authenticate(user=collaborator)

        response = self.client.post(
            self.url,
            {"title": "Collaborator note", "content": "Observation"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        note = Note.objects.get(pk=response.data["id"])
        self.assertEqual(note.author, collaborator)
        self.assertEqual(note.experiment, self.experiment)

    def test_unrelated_user_cannot_create_note(self):
        unrelated_user = User.objects.create_user(
            username="unrelated",
            email="unrelated@example.com",
            password="Pass123!",
            is_active=True,
        )
        self.client.force_authenticate(user=unrelated_user)

        response = self.client.post(
            self.url,
            {"title": "Forbidden note", "content": "Observation"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

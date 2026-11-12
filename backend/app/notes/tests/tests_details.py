import io

from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from PIL import Image

from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment, ExperimentCollaborator
from notes.models import Note, NoteImage

User = get_user_model()


class NoteDetailsTests(APITestCase):

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
            title="Old",
            content="Old body",
            author=self.owner,
        )

        self.url = f"/api/notes/{self.note.pk}/"


    def make_image(self, name="test.png"):

        buffer = io.BytesIO()
        Image.new("RGB", (10, 10), "green").save(buffer, format="PNG")

        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


    def test_owner_can_edit_note(self):

        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(self.url, {"title": "New", "content": "New body"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.note.refresh_from_db()

        self.assertEqual(self.note.title, "New")
        self.assertEqual(self.note.content, "New body")


    def test_stranger_cannot_edit_note(self):

        self.client.force_authenticate(user=self.stranger)

        response = self.client.patch(self.url, {"title": "New"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.note.refresh_from_db()
        self.assertEqual(self.note.title, "Old")


    def test_add_images_to_existing_note(self):

        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(self.url, {"images": [self.make_image("c.png")]}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.note.images.count(), 1)


    def test_note_image_url_uses_protected_endpoint(self):

        image = NoteImage.objects.create(
            note=self.note,
            image=self.make_image("private.png"),
        )

        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertTrue(response.data["images"][0]["image_url"].endswith(f"/api/note-images/{image.pk}/content/")
        )


    def test_collaborator_with_edit_permission_can_edit_own_note(self):

        ExperimentCollaborator.objects.create(
            experiment=self.experiment,
            user=self.stranger,
            can_edit_notes=True,
        )

        note = Note.objects.create(
            experiment=self.experiment,
            author=self.stranger,
            title="Own note",
            content="Original",
        )

        self.client.force_authenticate(user=self.stranger)

        url = f"/api/notes/{note.pk}/"

        response = self.client.patch(url, {"title": "New"},format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        note.refresh_from_db()
        self.assertEqual(note.title, "New")


    def test_collaborator_with_edit_permission_cannot_edit_others_note(self):

        ExperimentCollaborator.objects.create(
            experiment=self.experiment,
            user=self.stranger,
            can_edit_notes=True,
        )

        self.client.force_authenticate(user=self.stranger)

        response = self.client.patch(self.url, {"title": "New"}, format="json",)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.note.refresh_from_db()
        self.assertEqual(self.note.title, "Old")
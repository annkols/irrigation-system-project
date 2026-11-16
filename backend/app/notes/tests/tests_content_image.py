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


class NoteImageContentTests(APITestCase):

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
            image=self.make_image("private.png"),
        )

        self.url = f"/api/note-images/{self.image.pk}/content/"


    def make_image(self, name="test.png"):

        buffer = io.BytesIO()
        Image.new("RGB", (10, 10), "green").save(buffer, format="PNG")

        return SimpleUploadedFile(
            name,
            buffer.getvalue(),
            content_type="image/png",
        )


    @override_settings(DEBUG=False)
    def test_owner_receives_internal_redirect_for_note_image(self):

        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["X-Accel-Redirect"],
            f"/media/{self.image.image.name}",
        )
        self.assertEqual(response["Content-Type"], "image/png")
        self.assertIn("inline;", response["Content-Disposition"])


    @override_settings(DEBUG=False)
    def test_stranger_cannot_read_note_image(self):

        self.client.force_authenticate(user=self.stranger)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
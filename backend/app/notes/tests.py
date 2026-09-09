import io

from django.contrib.auth import get_user_model
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment, ExperimentCollaborator
from notes.models import Note, NoteImage

User = get_user_model()


def make_image(name='test.png'):
    from django.core.files.uploadedfile import SimpleUploadedFile
    buffer = io.BytesIO()
    Image.new('RGB', (10, 10), 'green').save(buffer, format='PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


class NoteEditImageTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', email='owner@example.com', password='Pass123!', is_active=True,
        )
        self.stranger = User.objects.create_user(
            username='stranger', email='stranger@example.com', password='Pass123!', is_active=True,
        )
        self.experiment = Experiment.objects.create(name='Exp', owner=self.owner, sensor_set_id=1)
        self.note = Note.objects.create(experiment=self.experiment, title='Old', content='old body')

    def test_owner_can_edit_note(self):
        self.client.force_authenticate(self.owner)
        res = self.client.patch(f'/api/notes/{self.note.id}/', {'title': 'New', 'content': 'new body'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.note.refresh_from_db()
        self.assertEqual(self.note.title, 'New')
        self.assertEqual(self.note.content, 'new body')

    def test_stranger_cannot_edit_note(self):
        self.client.force_authenticate(self.stranger)
        res = self.client.patch(f'/api/notes/{self.note.id}/', {'title': 'Hacked'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_list_notes(self):
        res = self.client.get(f'/api/experiments/{self.experiment.id}/notes/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_multiple_images_on_create(self):
        self.client.force_authenticate(self.owner)
        res = self.client.post(
            f'/api/experiments/{self.experiment.id}/notes/',
            {'title': 'With images', 'images': [make_image('a.png'), make_image('b.png')]},
            format='multipart',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(res.data['images']), 2)

    def test_add_images_to_existing_note(self):
        self.client.force_authenticate(self.owner)
        res = self.client.patch(
            f'/api/notes/{self.note.id}/',
            {'images': [make_image('c.png')]},
            format='multipart',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.note.images.count(), 1)

    def test_delete_single_image(self):
        image = NoteImage.objects.create(note=self.note, image=make_image('d.png'))
        self.client.force_authenticate(self.owner)
        res = self.client.delete(f'/api/note-images/{image.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(NoteImage.objects.filter(id=image.id).exists())

    def test_stranger_cannot_delete_image(self):
        image = NoteImage.objects.create(note=self.note, image=make_image('e.png'))
        self.client.force_authenticate(self.stranger)
        res = self.client.delete(f'/api/note-images/{image.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(NoteImage.objects.filter(id=image.id).exists())

    def test_collaborator_with_edit_permission_can_edit(self):
        ExperimentCollaborator.objects.create(
            experiment=self.experiment, user=self.stranger, can_edit_experiment=True,
        )
        self.client.force_authenticate(self.stranger)
        res = self.client.patch(f'/api/notes/{self.note.id}/', {'title': 'By collaborator'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

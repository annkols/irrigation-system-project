import io
import os
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment, ExperimentCollaborator
from notes.models import BBCHObservation, Note, NoteAttachment, NoteImage

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
        self.note = Note.objects.create(experiment=self.experiment, title='Old', content='old body', author=self.owner,)

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

    @override_settings(DEBUG=False)
    def test_owner_receives_internal_redirect_for_note_image(self):
        image = NoteImage.objects.create(note=self.note, image=make_image('private.png'))
        self.client.force_authenticate(self.owner)

        res = self.client.get(f'/api/note-images/{image.id}/content/')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res['X-Accel-Redirect'],
            f'/media/{image.image.name}',
        )
        self.assertEqual(res['Content-Type'], 'image/png')
        self.assertIn('inline;', res['Content-Disposition'])

    @override_settings(DEBUG=False)
    def test_stranger_cannot_read_note_image(self):
        image = NoteImage.objects.create(note=self.note, image=make_image('private.png'))
        self.client.force_authenticate(self.stranger)

        res = self.client.get(f'/api/note-images/{image.id}/content/')

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_note_image_url_uses_protected_endpoint(self):
        image = NoteImage.objects.create(note=self.note, image=make_image('private.png'))
        self.client.force_authenticate(self.owner)

        res = self.client.get(f'/api/notes/{self.note.id}/')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(
            res.data['images'][0]['image_url'].endswith(
                f'/api/note-images/{image.id}/content/'
            )
        )

    def test_owner_can_create_and_list_bbch_observation(self):
        self.client.force_authenticate(self.owner)

        create_response = self.client.post(
            f'/api/experiments/{self.experiment.id}/bbch-observations/',
            {
                'observation_date': '2026-11-02',
                'phase': '12',
                'remarks': 'Two leaves unfolded.',
            },
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        observation = BBCHObservation.objects.get(experiment=self.experiment)
        self.assertEqual(observation.author, self.owner)
        self.assertEqual(observation.phase, '12')

        list_response = self.client.get(
            f'/api/experiments/{self.experiment.id}/bbch-observations/'
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

    def test_stranger_cannot_create_bbch_observation(self):
        self.client.force_authenticate(self.stranger)

        response = self.client.post(
            f'/api/experiments/{self.experiment.id}/bbch-observations/',
            {
                'observation_date': '2026-11-02',
                'phase': '12',
                'remarks': '',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_collaborator_with_edit_permission_can_edit_own_note(self):
        ExperimentCollaborator.objects.create(
            experiment=self.experiment, user=self.stranger, can_edit_notes=True,
        )

        note = Note.objects.create(
            experiment=self.experiment,
            author=self.stranger,
            title="Own note",
            content="Original",
        )
        self.client.force_authenticate(self.stranger)
        res = self.client.patch(f'/api/notes/{note.id}/', {'title': 'By collaborator'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        note.refresh_from_db()
        self.assertEqual(note.title, "By collaborator")

    def test_collaborator_with_edit_permission_cannot_edit_others_note(self):
        ExperimentCollaborator.objects.create(
            experiment=self.experiment, user=self.stranger, can_edit_notes=True,
        )
        self.client.force_authenticate(user=self.stranger)

        response = self.client.patch(
            f"/api/notes/{self.note.id}/",
            {"title": "Not having permissions"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.note.refresh_from_db()
        self.assertEqual(self.note.title, "Old")


class NoteAttachmentTests(APITestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.settings_override = override_settings(MEDIA_ROOT=self.media_root)
        self.settings_override.enable()
        self.owner = User.objects.create_user(
            username='owner', email='owner@example.com', password='Pass123!', is_active=True,
        )
        self.stranger = User.objects.create_user(
            username='stranger', email='stranger@example.com', password='Pass123!', is_active=True,
        )
        self.experiment = Experiment.objects.create(name='Exp', owner=self.owner, sensor_set_id=1)
        self.note = Note.objects.create(experiment=self.experiment, title='Note', author=self.owner)

    def tearDown(self):
        self.settings_override.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)

    def make_file(self, name='wyniki pomiarów.csv', content=b'a;b\n1;2\n'):
        return SimpleUploadedFile(name, content, content_type='text/csv')

    def test_add_files_to_existing_note(self):
        self.client.force_authenticate(self.owner)

        res = self.client.patch(
            f'/api/notes/{self.note.id}/',
            {'attachments': [self.make_file(), self.make_file('protokol.pdf', b'%PDF-1.4')]},
            format='multipart',
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [(a['name'], a['size']) for a in res.data['attachments']],
            [('wyniki pomiarów.csv', 8), ('protokol.pdf', 8)],
        )
        self.assertTrue(
            res.data['attachments'][0]['file_url'].endswith(
                f"/api/note-attachments/{res.data['attachments'][0]['id']}/content/"
            )
        )

    def test_create_note_with_files(self):
        self.client.force_authenticate(self.owner)

        res = self.client.post(
            f'/api/experiments/{self.experiment.id}/notes/',
            {'title': 'With file', 'attachments': [self.make_file()]},
            format='multipart',
        )

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(res.data['attachments']), 1)

    @override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=None)
    def test_rejects_file_over_size_limit(self):
        from notes import views
        self.client.force_authenticate(self.owner)
        big = self.make_file('big.bin', b'x' * (views.MAX_ATTACHMENT_SIZE + 1))

        res = self.client.patch(f'/api/notes/{self.note.id}/', {'attachments': [big]}, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.note.attachments.count(), 0)

    def test_rejects_too_many_files(self):
        from notes import views
        self.client.force_authenticate(self.owner)
        files = [self.make_file(f'{i}.txt') for i in range(views.MAX_ATTACHMENTS_PER_NOTE + 1)]

        res = self.client.patch(f'/api/notes/{self.note.id}/', {'attachments': files}, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.note.attachments.count(), 0)

    def test_owner_downloads_file_with_original_name(self):
        attachment = NoteAttachment.objects.create(
            note=self.note, file=self.make_file(), original_name='wyniki pomiarów.csv', size=8,
        )
        self.client.force_authenticate(self.owner)

        res = self.client.get(f'/api/note-attachments/{attachment.id}/content/')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/octet-stream')
        self.assertIn('attachment;', res['Content-Disposition'])
        self.assertIn("filename*=utf-8''wyniki%20pomiar%C3%B3w.csv", res['Content-Disposition'])

    @override_settings(DEBUG=False)
    def test_download_uses_internal_redirect_in_production(self):
        attachment = NoteAttachment.objects.create(
            note=self.note, file=self.make_file(), original_name='data.csv', size=8,
        )
        self.client.force_authenticate(self.owner)

        res = self.client.get(f'/api/note-attachments/{attachment.id}/content/')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['X-Accel-Redirect'], f'/media/{attachment.file.name}')
        self.assertEqual(res['Content-Disposition'], 'attachment; filename="data.csv"')

    def test_stranger_cannot_download_or_delete_file(self):
        attachment = NoteAttachment.objects.create(
            note=self.note, file=self.make_file(), original_name='data.csv', size=8,
        )
        self.client.force_authenticate(self.stranger)

        self.assertEqual(
            self.client.get(f'/api/note-attachments/{attachment.id}/content/').status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.delete(f'/api/note-attachments/{attachment.id}/').status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertTrue(NoteAttachment.objects.filter(id=attachment.id).exists())

    def test_owner_can_delete_file(self):
        attachment = NoteAttachment.objects.create(
            note=self.note, file=self.make_file(), original_name='data.csv', size=8,
        )
        path = attachment.file.path
        self.client.force_authenticate(self.owner)

        res = self.client.delete(f'/api/note-attachments/{attachment.id}/')

        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(NoteAttachment.objects.filter(id=attachment.id).exists())
        self.assertFalse(os.path.exists(path))

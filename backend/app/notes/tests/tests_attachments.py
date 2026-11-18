import os
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment
from notes.models import Note, NoteAttachment

User = get_user_model()


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
        big = self.make_file('big.csv', b'x' * (views.MAX_ATTACHMENT_SIZE + 1))

        res = self.client.patch(f'/api/notes/{self.note.id}/', {'attachments': [big]}, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.note.attachments.count(), 0)

    def test_accepts_all_allowed_types(self):
        self.client.force_authenticate(self.owner)
        files = [
            self.make_file('a.pdf', b'%PDF-1.7 ...'),
            self.make_file('b.docx', b'PK\x03\x04 docx'),
            self.make_file('c.xlsx', b'PK\x03\x04 xlsx'),
            self.make_file('d.txt', 'zażółć'.encode()),
            self.make_file('E.CSV', b'a;b\n1;2\n'),
        ]

        res = self.client.patch(f'/api/notes/{self.note.id}/', {'attachments': files}, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.note.attachments.count(), 5)

    def test_rejects_disallowed_types(self):
        self.client.force_authenticate(self.owner)
        for name in ['film.mp4', 'zdjecie.jpg', 'strona.html', 'skrypt.exe', 'bez_rozszerzenia', 'stary.doc']:
            with self.subTest(name=name):
                res = self.client.patch(
                    f'/api/notes/{self.note.id}/',
                    {'attachments': [self.make_file(name, b'data')]},
                    format='multipart',
                )
                self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.note.attachments.count(), 0)

    def test_rejects_renamed_binary_file(self):
        self.client.force_authenticate(self.owner)
        video = b'\x00\x00\x00\x18ftypmp42' + b'\x00' * 100
        for name in ['film.pdf', 'film.docx', 'film.xlsx', 'film.txt', 'film.csv']:
            with self.subTest(name=name):
                res = self.client.patch(
                    f'/api/notes/{self.note.id}/',
                    {'attachments': [self.make_file(name, video)]},
                    format='multipart',
                )
                self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.note.attachments.count(), 0)

    def test_invalid_file_does_not_create_note_or_save_other_files(self):
        self.client.force_authenticate(self.owner)

        res = self.client.post(
            f'/api/experiments/{self.experiment.id}/notes/',
            {'title': 'Bad', 'attachments': [self.make_file(), self.make_file('film.mp4', b'data')]},
            format='multipart',
        )

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Note.objects.filter(title='Bad').exists())
        self.assertEqual(NoteAttachment.objects.count(), 0)

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

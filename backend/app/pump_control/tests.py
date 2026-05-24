from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import PumpCommand


class PumpCommandApiTests(APITestCase):
    def test_create_pump_command(self):
        response = self.client.post(
            reverse('pump-command-list-create'),
            {'command': 'ON'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PumpCommand.objects.count(), 1)
        self.assertEqual(response.data['command'], 'ON')
        self.assertEqual(response.data['arduino_command'], 'PUMP_ON')

    def test_rejects_invalid_pump_command(self):
        response = self.client.post(
            reverse('pump-command-list-create'),
            {'command': 'START'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('command', response.data)
        self.assertEqual(PumpCommand.objects.count(), 0)

    def test_latest_returns_newest_pump_command(self):
        older = PumpCommand.objects.create(command=PumpCommand.Command.ON)
        newest = PumpCommand.objects.create(command=PumpCommand.Command.AUTO)

        response = self.client.get(reverse('pump-command-latest'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], newest.id)
        self.assertNotEqual(response.data['id'], older.id)
        self.assertEqual(response.data['command'], 'AUTO')
        self.assertEqual(response.data['arduino_command'], 'PUMP_AUTO')

    def test_latest_returns_404_when_no_command_exists(self):
        response = self.client.get(reverse('pump-command-latest'))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('detail', response.data)

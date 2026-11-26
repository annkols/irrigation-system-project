from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment


User = get_user_model()


class AdminExperimentScheduleTests(APITestCase):
    def setUp(self):
        self.url = reverse("experiment-admin-schedule")
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="OwnerPass123!",
            first_name="Anna",
            last_name="Nowak",
        )
        self.regular_user = User.objects.create_user(
            username="regular",
            email="regular@example.com",
            password="RegularPass123!",
        )
        self.staff_user = User.objects.create_user(
            username="staff",
            email="staff@example.com",
            password="StaffPass123!",
            is_staff=True,
        )
        self.superuser = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="AdminPass123!",
        )
        started_at = timezone.now() - timedelta(days=2)
        self.experiment = Experiment.objects.create(
            name="Greenhouse experiment",
            owner=self.owner,
            sensor_set_id=7,
            started_at=started_at,
            planned_end_at=started_at + timedelta(days=14),
        )

    def test_schedule_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_cannot_view_schedule(self):
        self.client.force_authenticate(self.regular_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_user_without_superuser_flag_cannot_view_schedule(self):
        self.client.force_authenticate(self.staff_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_receives_schedule_with_owner_and_set_number(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        self.assertEqual(item["id"], self.experiment.id)
        self.assertEqual(item["sensor_set_id"], 7)
        self.assertEqual(item["owner"]["email"], self.owner.email)
        self.assertIsNone(item["finished_at"])

    def test_finished_at_is_returned_after_experiment_is_ended(self):
        self.client.force_authenticate(self.owner)
        end_response = self.client.post(
            reverse("experiment-end", args=[self.experiment.pk])
        )
        self.assertEqual(end_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data[0]["finished_at"])
        self.assertEqual(response.data[0]["status"], "completed")

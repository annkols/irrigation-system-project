from rest_framework.test import APITestCase
from rest_framework import status

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model

from experiments.models import Experiment, ExperimentCollaborator

User = get_user_model()

class ExperimentCollaboratorsTests(APITestCase):

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="testpass123",
        )

        self.collaborator = User.objects.create_user(
            username="collaborator",
            email="collaborator@example.com",
            password="testpass123",
        )

        self.experiment = Experiment.objects.create(
            name="Potato test",
            plant_name="Potato",
            sensor_set_id=1,
            owner=self.owner,
            started_at=timezone.now(),
            planned_end_at=timezone.now() + timedelta(days=1),
            finished_at=None,
        )

        self.outsider = User.objects.create_user(
            username="outsider",
            email="outsider@example.com",
            password="testpass123",
        )

        self.membership = ExperimentCollaborator.objects.create(
            experiment=self.experiment,
            user=self.collaborator,
        )

    
    def test_owner_can_view_experiment_collaborators(self):

        self.client.force_authenticate(user=self.owner)
        url = reverse("experiments-collaborators", kwargs={"pk": self.experiment.pk})

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK,)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.membership.id)
        self.assertEqual(response.data[0]["user"]["id"], self.collaborator.id)


    def test_collaborator_can_view_experiment_collaborators(self):

        self.client.force_authenticate(user=self.collaborator)
        url = reverse("experiments-collaborators", kwargs={"pk": self.experiment.pk})

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.membership.id)
        self.assertEqual(response.data[0]["user"]["id"], self.collaborator.id)


    def test_non_collaborator_cannot_view_experiment_collaborators(self):

        self.client.force_authenticate(user=self.outsider)
        url = reverse("experiments-collaborators", kwargs={"pk": self.experiment.pk})

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_unauthenticated_user_cannot_view_experiment_collaborators(self):

        self.client.force_authenticate(user=None)
        url = reverse("experiments-collaborators", kwargs={"pk": self.experiment.pk})

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment
from notes.models import BBCHObservation

User = get_user_model()


class ExperimentBBCHObservationTests(APITestCase):

    def setUp(self):

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

        self.url = f"/api/experiments/{self.experiment.pk}/bbch-observations/"


    def test_owner_can_create_and_list_bbch_observation(self):

        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.url,
            {
                "observation_date": "2026-11-02",
                "phase": "12",
                "remarks": "Two leaves unfolded.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        observation = BBCHObservation.objects.get(
            experiment=self.experiment
        )

        self.assertEqual(observation.author, self.owner)
        self.assertEqual(observation.phase, "12")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], observation.pk)


    def test_stranger_cannot_create_bbch_observation(self):

        self.client.force_authenticate(user=self.stranger)

        response = self.client.post(
            self.url,
            {
                "observation_date": "2026-11-02",
                "phase": "12",
                "remarks": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.assertFalse(
            BBCHObservation.objects.filter(
                experiment=self.experiment
            ).exists()
        )
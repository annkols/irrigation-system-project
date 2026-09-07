from rest_framework.test import APITestCase
from rest_framework import status


from django.urls import reverse
from django.contrib.auth import get_user_model

from experiments.models import Experiment, ExperimentCollaborator

User = get_user_model()

class ExperimentUserListsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="UserPass123!",
            is_active=True,
        )

        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="UserPass123!",
            is_active=True,
        )

        self.owned_experiment = Experiment.objects.create(
            name="Owned",
            owner=self.user,
            sensor_set_id=1,
        )

        self.collaborated_experiment = Experiment.objects.create(
            name="Collaborated",
            owner=self.other_user,
            sensor_set_id=2,
        )

        self.membership = ExperimentCollaborator.objects.create(
            experiment=self.collaborated_experiment,
            user=self.user,
        )

        self.unrelated_experiment = Experiment.objects.create(
            name="Unrelated",
            owner=self.other_user,
            sensor_set_id=3,
        )


    # VIEWING ONLY MY EXPERIMENTS -> 200
    def test_my_experiments_returns_only_owned_experiments(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("experiment-owned-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ids = [experiment["id"] for experiment in response.data]

        self.assertIn(self.owned_experiment.id, ids)
        self.assertNotIn(self.collaborated_experiment.id, ids)
        self.assertNotIn(self.unrelated_experiment.id, ids)


    # VIEWING ONLY THE EXPERIMENTS IVE COLLABORATED IN -> 200
    def test_collaborating_experiments_returns_only_collaborated_experiments(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("experiment-collaborated-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ids = [experiment["id"] for experiment in response.data]

        self.assertNotIn(self.owned_experiment.id, ids)
        self.assertIn(self.collaborated_experiment.id, ids)
        self.assertNotIn(self.unrelated_experiment.id, ids)
from rest_framework.test import APITestCase
from rest_framework import status


from django.urls import reverse
from django.contrib.auth import get_user_model

from experiments.models import Experiment, ExperimentCollaborator

User = get_user_model()

class ExperimentUserViewTests(APITestCase):

    def setUp(self):

        self.url = reverse("experiment-owned-list")

        self.colaborated_url = reverse("experiment-collaborated-list")

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

        self.new_user = User.objects.create_user(
            username="new_user",
            email="new@example.com",
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


    def test_my_experiments_returns_only_owned_experiments(self):

        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ids = [experiment["id"] for experiment in response.data]

        self.assertIn(self.owned_experiment.id, ids)
        self.assertNotIn(self.collaborated_experiment.id, ids)
        self.assertNotIn(self.unrelated_experiment.id, ids)


    def test_collaborating_experiments_returns_only_collaborated_experiments(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.colaborated_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ids = [experiment["id"] for experiment in response.data]

        self.assertNotIn(self.owned_experiment.id, ids)
        self.assertIn(self.collaborated_experiment.id, ids)
        self.assertNotIn(self.unrelated_experiment.id, ids)


    def test_owned_experiments_requires_authentication(self):

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_collaborated_experiments_requires_authentication(self):

        response = self.client.get(self.colaborated_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_owned_experiments_are_available_by_authenticated_user(self):

        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertCountEqual([experiment["id"] for experiment in response.data],
            [self.collaborated_experiment.id, self.unrelated_experiment.id]
        )

    def test_user_without_owned_experiments_returns_empty_list(self):

        self.client.force_authenticate(user=self.new_user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])


    def test_new_collaborator_can_see_experiment(self):

        self.client.force_authenticate(user=self.new_user)

        ExperimentCollaborator.objects.create(
            experiment=self.unrelated_experiment,
            user=self.new_user,
        )

        response = self.client.get(self.colaborated_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertIn(self.unrelated_experiment.id, [experiment["id"] for experiment in response.data])
        self.assertNotIn(self.collaborated_experiment.id, [experiment["id"] for experiment in response.data])
        self.assertNotIn(self.owned_experiment.id, [experiment["id"] for experiment in response.data])
        self.assertEqual(len([experiment["id"] for experiment in response.data]), 1)
        

    def test_removed_collaborator_no_longer_sees_experiment(self):

        self.client.force_authenticate(user=self.user)

        self.membership.delete()

        response = self.client.get(self.colaborated_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_owner_does_not_appear_in_collaborated_list(self):

        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(self.colaborated_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
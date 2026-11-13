from rest_framework.test import APITestCase
from rest_framework import status

from datetime import timedelta

from django.utils import timezone
from django.urls import reverse
from django.contrib.auth import get_user_model

from experiments.models import Experiment, ExperimentCollaborator, Keyword

User = get_user_model()

class ExperimentDeletionTests(APITestCase):

    def setUp(self):
        
        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="UserPass123!",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="UserPass123!",
            is_active=True,
        )

        started_at = timezone.now()
        planned_end_at = started_at + timedelta(days=7)

        self.owned_experiment = Experiment.objects.create(
            name="Potato test",
            description="Testing potato irrigation.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=started_at,
            planned_end_at=planned_end_at,
            finished_at=None,
            owner=self.user
        )

        self.collaborated_experiment = Experiment.objects.create(
            name="Tomato test",
            description="Testing tomato irrigation.",
            plant_name="Tomato",
            sensor_set_id=2,
            started_at=started_at.isoformat(),
            planned_end_at=planned_end_at.isoformat(),
            finished_at=None,
            owner=self.other_user
        )

        self.owned_membership = ExperimentCollaborator.objects.create(
            experiment=self.owned_experiment,
            user=self.other_user,
        )

        self.collaborated_membership = ExperimentCollaborator.objects.create(
            experiment=self.collaborated_experiment,
            user=self.user,
        )

        self.unrelated_experiment = Experiment.objects.create(
            name="Unrelated",
            owner=self.other_user,
            sensor_set_id=3,
        )

        keyword1 = Keyword.objects.create(name="potato")
        self.owned_experiment.keywords.add(keyword1)

        keyword2 = Keyword.objects.create(name="test")
        self.owned_experiment.keywords.add(keyword2)

        self.url = reverse("experiment-delete",kwargs={"pk": self.owned_experiment.pk})

        self.collaborated_url = reverse("experiment-delete", kwargs={"pk": self.collaborated_experiment.pk})

        self.unrelated_url = reverse("experiment-delete", kwargs={"pk": self.unrelated_experiment.pk})
    

    def test_delete_experiment_successfully(self):

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(Experiment.objects.filter(pk=self.owned_experiment.pk).exists())


    def test_collaborator_cannot_delete_experiment(self):

        response = self.client.delete(self.collaborated_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Experiment.objects.filter(pk=self.collaborated_experiment.pk).exists())


    def test_unrelated_user_cannot_delete_experiment(self):

        response = self.client.delete(self.unrelated_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Experiment.objects.filter(pk=self.unrelated_experiment.pk).exists())


    def test_anonymous_user_cannot_delete_experiment(self):

        self.client.force_authenticate(user=None)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(Experiment.objects.filter(pk=self.owned_experiment.pk).exists())


    def test_delete_nonexistent_experiment(self):

        url = reverse("experiment-delete", kwargs={"pk": 99999})

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


    def test_cannot_delete_already_deleted_experiment(self):

        first_response = self.client.delete(self.url)
        second_response = self.client.delete(self.url)

        self.assertEqual(first_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(second_response.status_code, status.HTTP_404_NOT_FOUND)

        self.assertFalse(Experiment.objects.filter(pk=self.owned_experiment.pk).exists())
    

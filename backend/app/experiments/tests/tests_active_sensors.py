
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from datetime import timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment

User = get_user_model()

class ExperimentActiveSensorConfigTests(APITestCase):

    def setUp(self):

        self.url = reverse("experiment-active-sensor-config")

        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="UserPass123!",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)


    def new_experiment(self, **overrides):

        data = {
            "name": "Soy test",
            "description": "Active config test.",
            "plant_name": "Soy",
            "owner": self.user,
            "sensor_set_id": 1,
            "started_at": timezone.now(),
            "finished_at": None,
            "measurement_frequency_seconds": 90,
            "sensor_frequencies": {
                "soil_moisture": 30,
                "light": 60,
            },
        }

        data.update(overrides)
        return Experiment.objects.create(**data)


    def test_active_sensor_config_returns_experiment_frequencies(self):

        self.new_experiment()

        response = self.client.get(
            self.url,
            {"sensor_set_id": 1},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sensor_frequencies"]["soil_moisture"], 30)
        self.assertEqual(response.data["sensor_frequencies"]["light"], 60)
        self.assertEqual(response.data["sensor_frequencies"]["pressure"], 0)


    def test_active_sensor_config_keeps_soil_moisture_enabled(self):

        self.new_experiment(
            sensor_set_id=2,
            sensor_frequencies={
                "air_temperature": 30,
                "air_humidity": 30,
                "light": 60,
            },
        )

        response = self.client.get(
            self.url,
            {"sensor_set_id": 2},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sensor_frequencies"]["soil_moisture"], 90)

        
    def test_active_sensor_config_returns_404_when_no_experiment_exists(self):

        response = self.client.get(
            self.url,
            {"sensor_set_id": 1},
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("detail", response.data)


    def test_active_sensor_config_does_not_return_future_experiment(self):

        self.new_experiment(
            started_at=timezone.now() + timedelta(days=1),
        )

        response = self.client.get(
            self.url,
            {"sensor_set_id": 1},
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


    def test_active_sensor_config_does_not_return_finished_experiment(self):

        self.new_experiment(
            started_at=timezone.now() - timedelta(days=2),
            finished_at=timezone.now() - timedelta(days=1),
        )

        response = self.client.get(
            self.url,
            {"sensor_set_id": 1},
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


    def test_active_sensor_config_filters_by_sensor_set_id(self):

        self.new_experiment(sensor_set_id=1)

        response = self.client.get(
            self.url,
            {"sensor_set_id": 2},
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


    def test_active_sensor_config_rejects_invalid_sensor_set_id(self):

        for invalid_id in ["abc", "0", "-1", "1.5", ""]:

            with self.subTest(sensor_set_id=invalid_id):

                response = self.client.get(
                    self.url,
                    {"sensor_set_id": invalid_id},
                )

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_active_sensor_config_defaults_to_sensor_set_one(self):

        experiment = self.new_experiment()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["experiment_id"], experiment.pk)
        self.assertEqual(response.data["sensor_set_id"], 1)


    def test_active_sensor_config_does_not_require_authentication(self):

        self.client.force_authenticate(user=None)

        experiment = self.new_experiment()

        response = self.client.get(
            self.url,
            {"sensor_set_id": 1},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["experiment_id"], experiment.pk)


    def test_active_sensor_config_uses_default_frequency_when_no_sensor_frequencies(self):

        self.new_experiment(
            measurement_frequency_seconds=90,
            sensor_frequencies={},
        )

        response = self.client.get(
            self.url,{"sensor_set_id": 1})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sensor_frequencies"]["soil_moisture"], 90)
        self.assertEqual(response.data["sensor_frequencies"]["light"], 90)
        self.assertEqual(response.data["sensor_frequencies"]["pressure"], 90)


    def test_active_sensor_config_uses_latest_active_experiment(self):

        old_experiment = self.new_experiment(
            sensor_frequencies={"soil_moisture": 30},
        )

        Experiment.objects.filter(pk=old_experiment.pk).update(
            created_at=timezone.now() - timedelta(minutes=10)
        )

        new_experiment = self.new_experiment(
            name="New soy test",
            sensor_frequencies={"soil_moisture": 60},
        )

        response = self.client.get(self.url,{"sensor_set_id": 1})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["experiment_id"], new_experiment.pk)
        self.assertEqual(response.data["sensor_frequencies"]["soil_moisture"], 60)

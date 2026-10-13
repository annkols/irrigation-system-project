from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from experiments.models import Experiment
from measurements.models import Measurement
from users.models import DismissedNotification


class UserNotificationTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="notification-owner",
            email="notification-owner@example.com",
            password="test-password-123",
        )
        self.client.force_authenticate(user=self.user)
        self.experiment = Experiment.objects.create(
            name="Sensor test",
            owner=self.user,
            sensor_set_id=1,
            started_at=timezone.now() - timedelta(hours=2),
            measurement_frequency_seconds=60,
        )

    def test_missing_measurements_create_sensor_alert(self):
        response = self.client.get(reverse("user-notifications"))

        self.assertEqual(response.status_code, 200)
        sensor_alert = next(item for item in response.data if item["type"] == "sensor_error")
        self.assertEqual(
            sensor_alert["id"],
            f"sensor_error_{self.experiment.pk}_no_measurements",
        )

    def test_new_outage_reappears_after_previous_one_was_dismissed(self):
        DismissedNotification.objects.create(
            user=self.user,
            notification_id=f"sensor_error_{self.experiment.pk}_no_measurements",
        )
        measurement = Measurement.objects.create(
            experiment=self.experiment,
            station_number=1,
            pot_number=1,
        )
        Measurement.objects.filter(pk=measurement.pk).update(
            created_at=timezone.now() - timedelta(hours=1)
        )

        response = self.client.get(reverse("user-notifications"))

        sensor_alert = next(item for item in response.data if item["type"] == "sensor_error")
        self.assertEqual(sensor_alert["id"], f"sensor_error_{self.experiment.pk}_{measurement.pk}")

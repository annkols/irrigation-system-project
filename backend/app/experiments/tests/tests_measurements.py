
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment
from measurements.models import Measurement

User = get_user_model()


class ExperimentMeasurementsDetailTests(APITestCase):

    def setUp(self):

        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="UserPass123!",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

        self.started_at = timezone.now() - timedelta(hours=1)

        self.experiment = Experiment.objects.create(
            name="Potato test",
            description="Experiment with measurements.",
            plant_name="Potato",
            owner=self.user,
            sensor_set_id=1,
            started_at=self.started_at,
            finished_at=None,
        )

        self.other_experiment = Experiment.objects.create(
            name="Other experiment",
            owner=self.user,
            sensor_set_id=1,
        )

        self.url = reverse(
            "experiment-with-measurements-detail",
            kwargs={"pk": self.experiment.pk},
        )


    def new_measurement(self, **overrides):

        data = {
            "experiment": self.experiment,
            "station_number": 1,
            "pot_number": 1,
            "raw_value": 512,
            "moisture_percent": 64.0,
            "air_temperature": 22.5,
            "air_humidity": 51.2,
            "pressure_hpa": 1008.4,
            "soil_temperature": 19.8,
            "light_lux": 420.5,
            "pump_on": False,
        }

        data.update(overrides)
        return Measurement.objects.create(**data)


    def test_experiment_with_measurements_returns_only_its_measurements(self):

        matching_measurement = self.new_measurement()

        non_matching_measurement = self.new_measurement(
            experiment=self.other_experiment,
            raw_value=600,
            moisture_percent=18.0,
            pump_on=True,
        )

        measurement_time = timezone.now() - timedelta(minutes=30)

        Measurement.objects.filter(
            pk__in=[matching_measurement.pk, non_matching_measurement.pk]
        ).update(created_at=measurement_time)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.experiment.pk)
        self.assertEqual(len(response.data["measurements"]), 1)
        self.assertEqual(
            response.data["measurements"][0]["id"],
            matching_measurement.pk,
        )


    def test_experiment_with_measurements_respects_started_at(self):

        old_measurement = self.new_measurement(raw_value=400, moisture_percent=40.0)
        new_measurement = self.new_measurement(raw_value=700, moisture_percent=70.0)

        Measurement.objects.filter(pk=old_measurement.pk).update(
            created_at=self.started_at - timedelta(hours=1)
        )

        Measurement.objects.filter(pk=new_measurement.pk).update(
            created_at=self.started_at + timedelta(minutes=30)
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["measurements"]), 1)
        self.assertEqual(response.data["measurements"][0]["id"],new_measurement.pk)

from rest_framework.test import APITestCase

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status


from measurements.models import Measurement
from .models import Experiment

# Create your tests here.
class ExperimentTests(APITestCase):
    def test_create_experiment_successfully(self):
        url = reverse('experiment-list-create')

        payload = {
            "name": "Potato test",
            "description": "Testing potato irrigation.",
            "plant_name": "Potato",
            "sensor_set_id": 1,
            "started_at": None,
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Potato test")
        self.assertEqual(response.data["plant_name"], "Potato")
        self.assertEqual(response.data["sensor_set_id"], 1)

    def test_create_experiment_with_sensor_frequencies(self):
        url = reverse('experiment-list-create')

        payload = {
            "name": "Soy test",
            "description": "Testing per-sensor frequencies.",
            "plant_name": "Soy",
            "sensor_set_id": 1,
            "started_at": None,
            "finished_at": None,
            "owner": None,
            "collaborators": [],
            "sensor_frequencies": {
                "soil_moisture": 30,
                "light": 60,
                "soil_temperature": 45,
                "air_temperature": 15,
                "air_humidity": 20,
                "pressure": 120
            }
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sensor_frequencies"]["soil_moisture"], 30)
        self.assertEqual(response.data["sensor_frequencies"]["pressure"], 120)

    def test_sensor_frequency_must_be_positive_integer(self):
        url = reverse('experiment-list-create')

        payload = {
            "name": "Soy test",
            "description": "Invalid sensor frequency.",
            "plant_name": "Soy",
            "sensor_set_id": 1,
            "started_at": None,
            "finished_at": None,
            "owner": None,
            "collaborators": [],
            "sensor_frequencies": {
                "soil_moisture": 0
            }
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sensor_frequencies", response.data)

    def test_active_sensor_config_returns_experiment_frequencies(self):
        Experiment.objects.create(
            name="Soy test",
            description="Active config test.",
            plant_name="Soy",
            sensor_set_id=1,
            started_at=timezone.now(),
            finished_at=None,
            measurement_frequency_seconds=90,
            sensor_frequencies={
                "soil_moisture": 30,
                "light": 60
            }
        )

        url = reverse('experiment-active-sensor-config')

        response = self.client.get(url, {"sensor_set_id": 1})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sensor_frequencies"]["soil_moisture"], 30)
        self.assertEqual(response.data["sensor_frequencies"]["light"], 60)
        self.assertEqual(response.data["sensor_frequencies"]["pressure"], 0)

    def test_active_sensor_config_keeps_soil_moisture_enabled(self):
        Experiment.objects.create(
            name="Soy test",
            description="Required soil moisture test.",
            plant_name="Soy",
            sensor_set_id=2,
            started_at=timezone.now(),
            finished_at=None,
            measurement_frequency_seconds=90,
            sensor_frequencies={
                "air_temperature": 30,
                "air_humidity": 30,
                "light": 60
            }
        )

        url = reverse('experiment-active-sensor-config')

        response = self.client.get(url, {"sensor_set_id": 2})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sensor_frequencies"]["soil_moisture"], 90)

    def test_experiment_name_cannot_be_empty(self):
        url = reverse('experiment-list-create')

        payload = {
            "name": "   ",
            "description": "Invalid experiment.",
            "plant_name": "Potato",
            "sensor_set_id": 1,
            "started_at": None,
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_experiment_name_too_long(self):
        url = reverse('experiment-list-create')

        payload = {
            "name": "Wpływ inokulacji i koinokulacji nasion soi (Glycine max (L.) Merr.) bakteriami Bradyrhizobium japonicum oraz Bacillus spp. na wzrost i rozwoj roslin, a takze cechy fizjologiczne",
            "description": "Test sprawdzajacy walidacje zbyt dlugiej nazwy doswiadczenia.",
            "plant_name": "Soja",
            "sensor_set_id": 1,
            "started_at": None,
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_plant_name_cannot_be_empty(self):
        url = reverse('experiment-list-create')

        payload = {
            "name": "Potato test",
            "description": "Invalid experiment.",
            "plant_name": "   ",
            "sensor_set_id": 1,
            "started_at": None,
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plant_name", response.data)

    def test_finished_at_cannot_be_before_started_at(self):
        url = reverse('experiment-list-create')

        started_at = timezone.now()
        finished_at = started_at - timedelta(hours=1)

        payload = {
            "name": "Potato test",
            "description": "Invalid date test.",
            "plant_name": "Potato",
            "sensor_set_id": 1,
            "started_at": started_at.isoformat(),
            "finished_at": finished_at.isoformat(),
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("finished_at", response.data)

    def test_finished_at_requires_started_at(self):
        url = reverse('experiment-list-create')

        payload = {
            "name": "Potato test",
            "description": "Invalid finished date.",
            "plant_name": "Potato",
            "sensor_set_id": 1,
            "started_at": None,
            "finished_at": timezone.now().isoformat(),
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("finished_at", response.data)

    def test_cannot_create_two_unfinished_experiments_for_same_sensor_set(self):
        Experiment.objects.create(
            name="Potato test",
            description="First experiment.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=timezone.now(),
            finished_at=None
        )

        url = reverse('experiment-list-create')

        payload = {
            "name": "Soy test",
            "description": "Second experiment.",
            "plant_name": "Soy",
            "sensor_set_id": 1,
            "started_at": timezone.now().isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sensor_set_id", response.data)

    def test_can_create_finished_experiment_for_same_sensor_set(self):
        started_at = timezone.now() - timedelta(days=2)
        finished_at = timezone.now() - timedelta(days=1)

        Experiment.objects.create(
            name="Old potato test",
            description="Finished experiment.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=started_at,
            finished_at=finished_at
        )

        url = reverse('experiment-list-create')

        payload = {
            "name": "New potato test",
            "description": "New experiment.",
            "plant_name": "Potato",
            "sensor_set_id": 1,
            "started_at": timezone.now().isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sensor_set_id"], 1)

    def test_experiment_with_measurements_returns_matching_station_measurements(self):
        started_at = timezone.now() - timedelta(hours=2)

        experiment = Experiment.objects.create(
            name="Potato test",
            description="Experiment with measurements.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=started_at,
            finished_at=None
        )

        matching_measurement = Measurement.objects.create(
            station_number=1,
            pot_number=1,
            raw_value=512,
            moisture_percent=64.0,
            air_temperature=22.5,
            air_humidity=51.2,
            pressure_hpa=1008.4,
            soil_temperature=19.8,
            light_lux=420.5,
            pump_on=False
        )

        non_matching_measurement = Measurement.objects.create(
            station_number=2,
            pot_number=1,
            raw_value=600,
            moisture_percent=18.0,
            air_temperature=24.0,
            air_humidity=46.5,
            pressure_hpa=1007.9,
            soil_temperature=21.0,
            light_lux=620.0,
            pump_on=True
        )

        # auto_now_add ignores manual created_at on create,
        # so update created_at after creating objects.
        Measurement.objects.filter(pk=matching_measurement.pk).update(
            created_at=timezone.now() - timedelta(minutes=30)
        )

        Measurement.objects.filter(pk=non_matching_measurement.pk).update(
            created_at=timezone.now() - timedelta(minutes=30)
        )

        url = reverse(
            'experiment-with-measurements-detail',
            kwargs={"pk": experiment.pk}
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], experiment.id)
        self.assertEqual(len(response.data["measurements"]), 1)
        self.assertEqual(response.data["measurements"][0]["station_number"],1)

    def test_experiment_with_measurements_respects_started_at(self):
        started_at = timezone.now() - timedelta(hours=1)

        experiment = Experiment.objects.create(
            name="Potato test",
            description="Date filter test.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=started_at,
            finished_at=None
        )

        old_measurement = Measurement.objects.create(
            station_number=1,
            pot_number=1,
            raw_value=400,
            moisture_percent=40.0,
            air_temperature=22.5,
            air_humidity=51.2,
            pressure_hpa=1008.4,
            soil_temperature=19.8,
            light_lux=420.5,
            pump_on=False
        )

        new_measurement = Measurement.objects.create(
            station_number=1,
            pot_number=1,
            raw_value=700,
            moisture_percent=70.0,
            air_temperature=22.5,
            air_humidity=51.2,
            pressure_hpa=1008.4,
            soil_temperature=19.8,
            light_lux=420.5,
            pump_on=False
        )

        Measurement.objects.filter(pk=old_measurement.pk).update(
            created_at=timezone.now() - timedelta(hours=2)
        )

        Measurement.objects.filter(pk=new_measurement.pk).update(
            created_at=timezone.now() - timedelta(minutes=30)
        )

        url = reverse(
            'experiment-with-measurements-detail',
            kwargs={"pk": experiment.pk}
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["measurements"]), 1)

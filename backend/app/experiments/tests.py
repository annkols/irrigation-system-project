from rest_framework.test import APITestCase

from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status


from measurements.models import Measurement
from .models import Experiment, Keyword

# Create your tests here.
class ExperimentTests(APITestCase):
    def test_create_experiment_successfully(self):
        url = reverse('experiment-list-create')
        started_at = timezone.now()
        planned_end_at = started_at + timedelta(days=7)

        payload = {
            "name": "Potato test",
            "description": "Testing potato irrigation.",
            "plant_name": "Potato",
            "keywords": ["irrigation", "potato"],
            "sensor_set_id": 1,
            "started_at": started_at.isoformat(),
            "planned_end_at": planned_end_at.isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Potato test")
        self.assertEqual(response.data["plant_name"], "Potato")
        self.assertEqual(response.data["sensor_set_id"], 1)
        self.assertEqual(response.data["keywords"], ["irrigation", "potato"])

    def test_create_experiment_with_sensor_frequencies(self):
        url = reverse('experiment-list-create')
        started_at = timezone.now()
        planned_end_at = started_at + timedelta(days=7)

        payload = {
            "name": "Soy test",
            "description": "Testing per-sensor frequencies.",
            "plant_name": "Soy",
            "keywords": ["soy", "sensors"],
            "sensor_set_id": 1,
            "started_at": started_at.isoformat(),
            "planned_end_at": planned_end_at.isoformat(),
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
            "keywords": ["soy"],
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
            "planned_end_at": (started_at + timedelta(days=1)).isoformat(),
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
            "planned_end_at": timezone.now().isoformat(),
            "finished_at": timezone.now().isoformat(),
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("started_at", response.data)

    def test_started_at_is_required(self):
        url = reverse('experiment-list-create')

        payload = {
            "name": "Potato test",
            "description": "Missing start date.",
            "plant_name": "Potato",
            "sensor_set_id": 1,
            "started_at": None,
            "planned_end_at": timezone.now().isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("started_at", response.data)

    def test_planned_end_at_is_required(self):
        url = reverse('experiment-list-create')

        payload = {
            "name": "Potato test",
            "description": "Missing planned end date.",
            "plant_name": "Potato",
            "sensor_set_id": 1,
            "started_at": timezone.now().isoformat(),
            "planned_end_at": None,
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("planned_end_at", response.data)

    def test_cannot_create_two_unfinished_experiments_for_same_sensor_set(self):
        started_at = timezone.now()
        planned_end_at = started_at + timedelta(days=7)

        Experiment.objects.create(
            name="Potato test",
            description="First experiment.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=started_at,
            planned_end_at=planned_end_at,
            finished_at=None
        )

        url = reverse('experiment-list-create')

        payload = {
            "name": "Soy test",
            "description": "Second experiment.",
            "plant_name": "Soy",
            "keywords": ["soy"],
            "sensor_set_id": 1,
            "started_at": (started_at + timedelta(days=1)).isoformat(),
            "planned_end_at": (planned_end_at + timedelta(days=1)).isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sensor_set_id", response.data)

    def test_cannot_create_experiment_for_same_sensor_set_when_dates_overlap(self):
        started_at = timezone.now() + timedelta(days=1)
        planned_end_at = started_at + timedelta(days=3)

        Experiment.objects.create(
            name="Potato test",
            description="First scheduled experiment.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=started_at,
            planned_end_at=planned_end_at,
            finished_at=None
        )

        url = reverse('experiment-list-create')

        payload = {
            "name": "Soy test",
            "description": "Overlapping scheduled experiment.",
            "plant_name": "Soy",
            "sensor_set_id": 1,
            "started_at": (started_at + timedelta(days=1)).isoformat(),
            "planned_end_at": (planned_end_at + timedelta(days=1)).isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sensor_set_id", response.data)

    def test_can_create_experiment_for_same_sensor_set_when_dates_do_not_overlap(self):
        started_at = timezone.now() + timedelta(days=1)
        planned_end_at = started_at + timedelta(days=2)

        Experiment.objects.create(
            name="Potato test",
            description="First scheduled experiment.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=started_at,
            planned_end_at=planned_end_at,
            finished_at=None
        )

        url = reverse('experiment-list-create')

        payload = {
            "name": "Soy test",
            "description": "Later scheduled experiment.",
            "plant_name": "Soy",
            "keywords": ["soy"],
            "sensor_set_id": 1,
            "started_at": (planned_end_at + timedelta(hours=1)).isoformat(),
            "planned_end_at": (planned_end_at + timedelta(days=2)).isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sensor_set_id"], 1)

    def test_can_create_scheduled_experiment_when_existing_same_sensor_set_has_no_dates(self):
        Experiment.objects.create(
            name="Unscheduled potato test",
            description="No dates selected.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=None,
            planned_end_at=None,
            finished_at=None
        )

        started_at = timezone.now() + timedelta(days=30)
        planned_end_at = started_at + timedelta(days=10)
        url = reverse('experiment-list-create')

        payload = {
            "name": "Scheduled soy test",
            "description": "Scheduled experiment.",
            "plant_name": "Soy",
            "keywords": ["soy"],
            "sensor_set_id": 1,
            "started_at": started_at.isoformat(),
            "planned_end_at": planned_end_at.isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sensor_set_id"], 1)

    def test_keywords_are_required_when_creating_experiment(self):
        started_at = timezone.now() + timedelta(days=1)
        payload = {
            "name": "Barley test",
            "description": "Experiment without keywords.",
            "plant_name": "Barley",
            "sensor_set_id": 1,
            "started_at": started_at.isoformat(),
            "planned_end_at": (started_at + timedelta(days=7)).isoformat(),
            "owner": None,
            "collaborators": [],
        }

        response = self.client.post(
            reverse('experiment-list-create'), payload, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("keywords", response.data)

    def test_keywords_are_normalized_and_duplicates_removed(self):
        started_at = timezone.now() + timedelta(days=1)
        payload = {
            "name": "Barley salinity test",
            "description": "Keyword normalization.",
            "plant_name": "Barley",
            "keywords": [" Salinity ", "salinity", "Water   stress"],
            "sensor_set_id": 1,
            "started_at": started_at.isoformat(),
            "planned_end_at": (started_at + timedelta(days=7)).isoformat(),
            "owner": None,
            "collaborators": [],
        }

        response = self.client.post(
            reverse('experiment-list-create'), payload, format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["keywords"], ["salinity", "water stress"])
        self.assertEqual(Keyword.objects.count(), 2)

    def test_public_search_filters_by_keywords_and_hides_private_experiments(self):
        public_experiment = Experiment.objects.create(
            name="Public barley test",
            description="Visible experiment.",
            plant_name="Barley",
            sensor_set_id=1,
            is_public=True,
        )
        private_experiment = Experiment.objects.create(
            name="Private barley test",
            description="Hidden experiment.",
            plant_name="Barley",
            sensor_set_id=2,
            is_public=False,
        )
        keyword = Keyword.objects.create(name="salinity")
        public_experiment.keywords.add(keyword)
        private_experiment.keywords.add(keyword)

        response = self.client.get(
            reverse('experiment-public-search'), {"keywords": "salinity"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [public_experiment.id])

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
        new_started_at = timezone.now()
        new_planned_end_at = new_started_at + timedelta(days=7)

        payload = {
            "name": "New potato test",
            "description": "New experiment.",
            "plant_name": "Potato",
            "keywords": ["potato"],
            "sensor_set_id": 1,
            "started_at": new_started_at.isoformat(),
            "planned_end_at": new_planned_end_at.isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sensor_set_id"], 1)

    def test_completed_experiment_does_not_block_same_sensor_set_date_range(self):
        started_at = timezone.now() + timedelta(days=1)
        planned_end_at = started_at + timedelta(days=7)
        finished_at = started_at + timedelta(days=3)

        Experiment.objects.create(
            name="Completed potato test",
            description="Historical experiment.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=started_at,
            planned_end_at=planned_end_at,
            finished_at=finished_at
        )

        url = reverse('experiment-list-create')

        payload = {
            "name": "New soy test",
            "description": "Same date range as completed experiment.",
            "plant_name": "Soy",
            "keywords": ["soy"],
            "sensor_set_id": 1,
            "started_at": started_at.isoformat(),
            "planned_end_at": planned_end_at.isoformat(),
            "finished_at": None,
            "owner": None,
            "collaborators": []
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sensor_set_id"], 1)

    def test_delete_experiment_successfully(self):
        experiment = Experiment.objects.create(
            name="Potato test",
            description="Experiment to delete.",
            plant_name="Potato",
            sensor_set_id=1,
            started_at=None,
            finished_at=None
        )

        url = reverse('experiment-delete', kwargs={"pk": experiment.pk})

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Experiment.objects.filter(pk=experiment.pk).exists())

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

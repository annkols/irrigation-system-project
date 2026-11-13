from rest_framework.test import APITestCase
from rest_framework import status

from datetime import timedelta

from django.utils import timezone
from django.urls import reverse
from django.contrib.auth import get_user_model

from experiments.models import Experiment, ExperimentCollaborator, Keyword

User = get_user_model()

class ExperimentCreationTests(APITestCase):

    def setUp(self):
        self.url = reverse("experiment-list-create")
        
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


    def new_payload(self, **overrides):

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
            "collaborators": []
        }

        payload.update(overrides)
        return payload

    def test_create_experiment_successfully(self):

        response = self.client.post(self.url, self.new_payload(), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Potato test")
        self.assertEqual(response.data["plant_name"], "Potato")
        self.assertEqual(response.data["sensor_set_id"], 1)
        self.assertEqual(response.data["keywords"], ["irrigation", "potato"])

    def test_create_experiment_with_sensor_frequencies(self):

        response = self.client.post(self.url, self.new_payload(
            sensor_frequencies={
                "soil_moisture": 30,
                "light": 60,
                "soil_temperature": 45,
                "air_temperature": 15,
                "air_humidity": 20,
                "pressure": 120,
            }), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sensor_frequencies"]["soil_moisture"], 30)
        self.assertEqual(response.data["sensor_frequencies"]["pressure"], 120)


    def test_experiment_name_cannot_be_empty(self):

        response = self.client.post(self.url, self.new_payload(
            name="   ",
            ), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)


    def test_experiment_name_too_long(self):
        
        response = self.client.post(self.url, self.new_payload(
            name="Wpływ inokulacji i koinokulacji nasion soi (Glycine max (L.) Merr.) bakteriami Bradyrhizobium japonicum oraz Bacillus spp. na wzrost i rozwoj roslin, a takze cechy fizjologiczne",
            ), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)


    def test_plant_name_cannot_be_empty(self):
        
        response = self.client.post(self.url, self.new_payload(
            plant_name="  "
            ), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plant_name", response.data)


    def test_finished_at_cannot_be_before_started_at(self):

        started_at = timezone.now()
        finished_at = started_at - timedelta(hours=1)

        response = self.client.post(self.url, self.new_payload(
            started_at=started_at.isoformat(),
            planned_end_at=(started_at + timedelta(days=1)).isoformat(),
            finished_at=finished_at.isoformat()
            ), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("finished_at", response.data)


    def test_finished_at_requires_started_at(self):

        finished_at = timezone.now()

        response = self.client.post(self.url, self.new_payload(
            started_at=None,
            planned_end_at= finished_at.isoformat(),
            finished_at=finished_at.isoformat()
            ), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("started_at", response.data)


    def test_started_at_is_required(self):

        planned_end_at = timezone.now()

        response = self.client.post(self.url, self.new_payload(
            started_at=None,
            planned_end_at=planned_end_at.isoformat(),
            finished_at=None
            ), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("started_at", response.data)


    def test_planned_end_at_is_required(self):

        started_at = timezone.now()

        response = self.client.post(self.url, self.new_payload(
            started_at=started_at.isoformat(),
            planned_end_at=None,
            finished_at=None
            ), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("planned_end_at", response.data)


    def test_sensor_frequency_must_be_positive_integer(self):

        response = self.client.post(self.url, self.new_payload(
            sensor_frequencies={
                "soil_moisture": 0
            }
        ), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sensor_frequencies", response.data)


    def test_keywords_are_required_when_creating_experiment(self):

        response = self.client.post(self.url, self.new_payload(
            keywords=None
        ), format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("keywords", response.data)


    def test_keywords_are_normalized_and_duplicates_removed(self):

        response = self.client.post(self.url, self.new_payload(
            keywords=[" Salinity ", "salinity", "Water   stress"]
        ), format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["keywords"], ["salinity", "water stress"])
        self.assertEqual(Keyword.objects.count(), 2)


    def test_cannot_create_two_unfinished_experiments_for_same_sensor_set(self):

        started_at = timezone.now()
        planned_end_at = started_at + timedelta(days=7)
    
        Experiment.objects.create(
            name="Existing test",
            owner=self.user,
            sensor_set_id=1,
            started_at=started_at,
            planned_end_at=planned_end_at,
            finished_at=None,
        )

        second_response = self.client.post(self.url, self.new_payload(
            name="Soy test",
            description="Second experiment.",
            plant_name="Soy",
            keywords=["soy"],
            started_at=(started_at + timedelta(days=1)).isoformat(),
            planned_end_at=(planned_end_at + timedelta(days=1)).isoformat()
        ), format='json')

        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sensor_set_id", second_response.data)


    def test_can_create_experiment_for_same_sensor_set_when_dates_do_not_overlap(self):
        
        started_at = timezone.now() + timedelta(days=1)
        planned_end_at = started_at + timedelta(days=2)

        Experiment.objects.create(
            name="Existing test",
            owner=self.user,
            sensor_set_id=1,
            started_at=started_at,
            planned_end_at=planned_end_at,
            finished_at=None,
        )

        second_response = self.client.post(self.url, self.new_payload(
            name="Soy test",
            description="Second experiment.",
            plant_name="Soy",
            keywords=["soy"],
            started_at=(planned_end_at + timedelta(hours=1)).isoformat(),
            planned_end_at=(planned_end_at + timedelta(days=2)).isoformat()
        ), format='json')

        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.data["sensor_set_id"], 1)


    def test_can_create_scheduled_experiment_when_existing_same_sensor_set_has_no_dates(self):

        Experiment.objects.create(
            name="Undated experiment",
            owner=self.user,
            sensor_set_id=1,
            started_at=None,
            planned_end_at=None,
            finished_at=None,
    )
        started_at = timezone.now() + timedelta(days=30)
        planned_end_at = started_at + timedelta(days=10)

        second_response = self.client.post(self.url, self.new_payload(
            name="Soy test",
            description="Second experiment.",
            plant_name="Soy",
            keywords=["soy"],
            started_at=started_at.isoformat(),
            planned_end_at=planned_end_at.isoformat(),
        ), format='json')

        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.data["sensor_set_id"], 1)


    def test_completed_experiment_does_not_block_same_sensor_set_date_range(self):

        started_at = timezone.now() + timedelta(days=1)
        planned_end_at = started_at + timedelta(days=7)
        finished_at = started_at + timedelta(days=3)

        Experiment.objects.create(
            name="Completed test",
            owner=self.user,
            sensor_set_id=1,
            started_at=started_at,
            planned_end_at=planned_end_at,
            finished_at=finished_at,
        )

        second_response = self.client.post(self.url, self.new_payload(
            name="New soy test",
            description="Second experiment.",
            plant_name="Soy",
            keywords=["soy"],
            sensor_set_id=1,
            started_at=finished_at.isoformat(),
            planned_end_at=planned_end_at.isoformat(),
            finished_at=None,
        ), format="json")

        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.data["sensor_set_id"], 1)


        
    def test_can_create_finished_experiment_for_same_sensor_set(self):

        started_at = timezone.now() - timedelta(days=2)
        finished_at = timezone.now() - timedelta(days=1)
        planned_end_at = started_at + timedelta(days=7)

        Experiment.objects.create(
            name="Completed test",
            owner=self.user,
            sensor_set_id=1,
            started_at=started_at,
            planned_end_at=planned_end_at,
            finished_at=finished_at,
        )

        new_started_at = timezone.now()
        new_planned_end_at = new_started_at + timedelta(days=7)

        second_response = self.client.post(self.url, self.new_payload(
            name="New soy test",
            description="Second experiment.",
            plant_name="Soy",
            keywords=["soy"],
            sensor_set_id=1,
            started_at=new_started_at.isoformat(),
            planned_end_at=new_planned_end_at.isoformat(),
            finished_at=None,
        ), format="json")

        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.data["sensor_set_id"], 1)
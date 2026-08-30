from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Experiment, PotHardwareAssignment


class ExperimentDesignApiTests(APITestCase):
    def setUp(self):
        self.experiment = Experiment.objects.create(
            name="Drought and inoculation",
            plant_name="Barley",
            sensor_set_id=7,
            started_at=timezone.now(),
            planned_end_at=timezone.now() + timedelta(days=30),
        )
        self.url = reverse("experiment-design", kwargs={"pk": self.experiment.pk})

    def test_creates_full_factorial_plan_and_pots(self):
        response = self.client.put(
            self.url,
            {
                "factors": [
                    {
                        "name": "Drought",
                        "levels": [
                            {"label": "control", "is_reference": True},
                            {"label": "stress", "is_reference": False},
                        ],
                    },
                    {
                        "name": "Seed inoculation",
                        "levels": [
                            {"label": "none", "is_reference": True},
                            {"label": "inoculated", "is_reference": False},
                        ],
                    },
                ],
                "repetitions": 3,
                "pot_assignments": [
                    {
                        "label": "P1",
                        "is_monitored": True,
                        "soil_moisture": "SM-01",
                        "soil_temperature": "ST-01",
                        "pump": "PUMP-01",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["factors"]), 2)
        self.assertEqual(len(response.data["treatments"]), 4)
        self.assertEqual(len(response.data["pots"]), 12)
        self.assertTrue(response.data["pots"][0]["is_monitored"])
        self.assertEqual(
            PotHardwareAssignment.objects.filter(pot__experiment=self.experiment).count(),
            3,
        )
    def test_allows_same_identifier_for_different_device_types(self):
        response = self.client.put(
            self.url,
            {
                "factors": [{
                    "name": "Drought",
                    "levels": [
                        {"label": "control", "is_reference": True},
                        {"label": "stress", "is_reference": False},
                    ],
                }],
                "repetitions": 1,
                "pot_assignments": [{
                    "label": "P1",
                    "is_monitored": True,
                    "soil_moisture": "1",
                    "soil_temperature": "1",
                    "pump": "1",
                }],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            PotHardwareAssignment.objects.filter(pot__experiment=self.experiment).count(),
            3,
        )

    def test_requires_one_reference_level_for_each_factor(self):
        response = self.client.put(
            self.url,
            {
                "factors": [
                    {
                        "name": "Drought",
                        "levels": [
                            {"label": "control", "is_reference": False},
                            {"label": "stress", "is_reference": False},
                        ],
                    }
                ],
                "repetitions": 1,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("factors", response.data)

    def test_can_include_only_selected_combinations(self):
        response = self.client.put(
            self.url,
            {
                "factors": [
                    {
                        "name": "Drought",
                        "levels": [
                            {"label": "control", "is_reference": True},
                            {"label": "stress", "is_reference": False},
                        ],
                    },
                    {
                        "name": "Inoculation",
                        "levels": [
                            {"label": "none", "is_reference": True},
                            {"label": "yes", "is_reference": False},
                        ],
                    },
                ],
                "repetitions": 2,
                "selected_combinations": [
                    {"Drought": "control", "Inoculation": "none"},
                    {"Drought": "stress", "Inoculation": "yes"},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["treatments"]), 2)
        self.assertEqual(len(response.data["pots"]), 4)

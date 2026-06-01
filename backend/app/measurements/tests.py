from datetime import datetime

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from experiments.models import Experiment
from .models import Measurement


class MeasurementApiTests(APITestCase):
    def test_create_measurement_with_full_sensor_payload(self):
        payload = {
            "station_number": 2,
            "pot_number": 3,
            "moisture_percent": 58,
            "air_temperature": 23.1,
            "air_humidity": 49.7,
            "pressure_hpa": 1009.2,
            "soil_temperature": 20.4,
            "light_lux": 510.0,
            "pump_on": True,
        }

        response = self.client.post(
            reverse("measurement-list-create"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Measurement.objects.count(), 1)

        measurement = Measurement.objects.get()
        self.assertEqual(measurement.station_number, 2)
        self.assertEqual(measurement.pot_number, 3)
        self.assertEqual(measurement.moisture_percent, 58)
        self.assertTrue(measurement.pump_on)
        self.assertIsNone(measurement.raw_value)
        self.assertEqual(response.data["station_number"], 2)
        self.assertNotIn("raw_value", response.data)
        self.assertNotIn("device_name", response.data)

    def test_rejects_moisture_percent_above_100(self):
        payload = {
            "station_number": 1,
            "pot_number": 1,
            "moisture_percent": 101,
        }

        response = self.client.post(
            reverse("measurement-list-create"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("moisture_percent", response.data)
        self.assertEqual(Measurement.objects.count(), 0)

    def test_latest_returns_newest_measurement(self):
        older = Measurement.objects.create(
            station_number=1,
            pot_number=1,
            moisture_percent=30,
        )
        newest = Measurement.objects.create(
            station_number=1,
            pot_number=2,
            moisture_percent=70,
            air_temperature=24.5,
        )

        response = self.client.get(reverse("measurement-latest"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], newest.id)
        self.assertNotEqual(response.data["id"], older.id)
        self.assertEqual(response.data["pot_number"], 2)
        self.assertEqual(response.data["moisture_percent"], 70)

    def test_latest_returns_404_when_no_measurements_exist(self):
        response = self.client.get(reverse("measurement-latest"))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("detail", response.data)

    def test_export_filters_by_experiment_sensor_set_and_formats_local_time(self):
        experiment = Experiment.objects.create(
            name="Soy extended light test",
            description="Export test.",
            plant_name="Soy",
            sensor_set_id=2,
            started_at=datetime(2026, 6, 1, 8, 0, tzinfo=timezone.get_current_timezone()),
            planned_end_at=datetime(2026, 6, 1, 10, 0, tzinfo=timezone.get_current_timezone()),
            sensor_frequencies={
                "soil_moisture": 30,
                "air_temperature": 60,
                "air_humidity": 60,
                "light": 30,
            },
        )
        matching = Measurement.objects.create(
            station_number=2,
            pot_number=1,
            moisture_percent=64,
            light_lux=420.5,
        )
        other_station = Measurement.objects.create(
            station_number=1,
            pot_number=1,
            moisture_percent=90,
        )
        Measurement.objects.filter(pk=matching.pk).update(
            created_at=datetime(2026, 6, 1, 9, 0, tzinfo=timezone.get_current_timezone())
        )
        Measurement.objects.filter(pk=other_station.pk).update(
            created_at=datetime(2026, 6, 1, 9, 0, tzinfo=timezone.get_current_timezone())
        )

        response = self.client.get(
            reverse("measurement-export-csv", kwargs={"experiment_id": experiment.pk})
        )
        content = response.content.decode()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("2026-06-01 09:00:00", content)
        self.assertIn(",2,1,", content)
        self.assertNotIn(",1,1,90", content)
        self.assertNotIn("+00:00", content)

import shutil
import tempfile

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from experiments.models import Experiment, ExperimentCameraAssignment, Pot, Treatment

from .models import CameraDevice, CameraFrame


class CameraFrameApiTests(APITestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.settings_override = override_settings(
            MEDIA_ROOT=self.media_root,
        )
        self.settings_override.enable()
        self.experiment = Experiment.objects.create(
            name="Test experiment",
            plant_name="Tomato",
            sensor_set_id=1,
            started_at=timezone.now(),
        )
        self.camera_device = CameraDevice.objects.create(
            name="Test camera",
            sensor_set_id=1,
        )
        self.camera_device.token_hash = CameraDevice.hash_token("camera-test-token")
        self.camera_device.save(update_fields=["token_hash"])

    def tearDown(self):
        self.settings_override.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)

    def upload_frame(self, token="camera-test-token", content_type="image/jpeg"):
        return self.client.generic(
            "POST",
            reverse("camera-frame-upload"),
            b"jpeg-data",
            content_type=content_type,
            HTTP_X_SENSOR_SET_ID="1",
            HTTP_X_CAMERA_TOKEN=token,
        )

    def test_upload_assigns_frame_to_active_experiment(self):
        response = self.upload_frame()

        self.assertEqual(response.status_code, 201)
        frame = CameraFrame.objects.get()
        self.assertEqual(frame.experiment, self.experiment)
        self.assertEqual(frame.camera, self.camera_device)
        self.assertEqual(frame.note, "Automatic camera upload")

        list_response = self.client.get(
            reverse("experiment-frame-list", args=[self.experiment.pk])
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)

    def test_upload_rejects_invalid_token(self):
        response = self.upload_frame(token="wrong-token")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(CameraFrame.objects.count(), 0)

    def test_upload_accepts_second_camera_in_the_same_sensor_set(self):
        other_camera = CameraDevice.objects.create(
            name="Other camera",
            sensor_set_id=1,
            token_hash=CameraDevice.hash_token("other-token"),
        )

        response = self.upload_frame(token="other-token")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(CameraFrame.objects.get().camera, other_camera)

    def test_upload_rejects_inactive_camera(self):
        self.camera_device.is_active = False
        self.camera_device.save(update_fields=["is_active"])

        response = self.upload_frame()

        self.assertEqual(response.status_code, 403)
        self.assertEqual(CameraFrame.objects.count(), 0)

    def test_upload_requires_active_experiment(self):
        self.experiment.finished_at = timezone.now()
        self.experiment.save(update_fields=["finished_at"])

        response = self.upload_frame()

        self.assertEqual(response.status_code, 409)
        self.assertEqual(CameraFrame.objects.count(), 0)

    def test_upload_rejects_non_jpeg_body(self):
        response = self.upload_frame(content_type="text/plain")

        self.assertEqual(response.status_code, 415)
        self.assertEqual(CameraFrame.objects.count(), 0)

    def test_latest_frame_image_returns_uploaded_jpeg(self):
        self.upload_frame()

        response = self.client.get(
            reverse("experiment-latest-frame-image", args=[self.experiment.pk])
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"jpeg-data")
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_latest_frame_image_can_be_selected_by_pot(self):
        treatment = Treatment.objects.create(
            experiment=self.experiment,
            name="Control",
        )
        pot = Pot.objects.create(
            experiment=self.experiment,
            treatment=treatment,
            label="P1",
            replicate_number=1,
            position=1,
        )
        ExperimentCameraAssignment.objects.create(
            experiment=self.experiment,
            pot=pot,
            camera=self.camera_device,
        )
        self.upload_frame()

        response = self.client.get(
            reverse("experiment-latest-frame-image", args=[self.experiment.pk]),
            {"pot_number": 1},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"jpeg-data")

    def test_delete_removes_database_record(self):
        upload_response = self.upload_frame()

        response = self.client.delete(
            reverse("camera-frame-delete", args=[upload_response.data["id"]])
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(CameraFrame.objects.count(), 0)

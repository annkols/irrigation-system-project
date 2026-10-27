import shutil
import tempfile

from django.test import override_settings
from django.contrib.auth import get_user_model
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
        self.user = get_user_model().objects.create_user(
            username="camera-owner",
            email="camera-owner@example.com",
            password="test-password-123",
        )
        self.experiment = Experiment.objects.create(
            name="Test experiment",
            plant_name="Tomato",
            owner=self.user,
            sensor_set_id=1,
            started_at=timezone.now(),
        )
        self.camera_device = CameraDevice.objects.create(
            name="Test camera",
            sensor_set_id=1,
        )
        self.camera_device.token_hash = CameraDevice.hash_token("camera-test-token")
        self.camera_device.save(update_fields=["token_hash"])
        self.treatment = Treatment.objects.create(
            experiment=self.experiment,
            name="Control",
        )
        self.pot = Pot.objects.create(
            experiment=self.experiment,
            treatment=self.treatment,
            label="P1",
            replicate_number=1,
            position=1,
        )
        ExperimentCameraAssignment.objects.create(
            experiment=self.experiment,
            pot=self.pot,
            camera=self.camera_device,
        )

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
        self.client.force_authenticate(user=self.user)

        response = self.upload_frame()

        self.assertEqual(response.status_code, 201)
        frame = CameraFrame.objects.get()
        self.assertEqual(frame.experiment, self.experiment)
        self.assertEqual(frame.camera, self.camera_device)
        self.assertEqual(frame.pot, self.pot)
        self.assertEqual(frame.note, "Automatic camera upload")
        self.assertFalse(frame.is_saved)
        self.assertIn(
            f"experiment_{self.experiment.id}/pot_1/camera_{self.camera_device.id}/",
            frame.image.name,
        )

        list_response = self.client.get(
            reverse("experiment-frame-list", args=[self.experiment.pk])
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 0)

    def test_authenticated_user_can_validate_camera_for_hardware_set(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("camera-device-validate", args=[self.camera_device.pk]),
            {"sensor_set_id": 1},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.camera_device.pk)
        self.assertEqual(response.data["name"], self.camera_device.name)

    def test_camera_validation_rejects_wrong_hardware_set(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("camera-device-validate", args=[self.camera_device.pk]),
            {"sensor_set_id": 2},
        )

        self.assertEqual(response.status_code, 404)

    def test_camera_validation_requires_authentication(self):
        response = self.client.get(
            reverse("camera-device-validate", args=[self.camera_device.pk]),
            {"sensor_set_id": 1},
        )

        self.assertIn(response.status_code, (401, 403))

    def test_owner_can_save_latest_frame_for_gallery(self):
        self.upload_frame()
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("experiment-save-latest-frame", args=[self.experiment.pk]),
            {"pot_number": 1},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        frame = CameraFrame.objects.get()
        self.assertTrue(frame.is_saved)
        self.assertIsNotNone(frame.saved_at)
        self.assertEqual(frame.captured_by, self.user)

        list_response = self.client.get(
            reverse("experiment-frame-list", args=[self.experiment.pk])
        )
        self.assertEqual(len(list_response.data), 1)

    def test_upload_replaces_only_the_previous_unsaved_preview(self):
        first_response = self.upload_frame()
        first_id = first_response.data["id"]

        second_response = self.upload_frame()

        self.assertNotEqual(first_id, second_response.data["id"])
        self.assertEqual(CameraFrame.objects.count(), 1)
        self.assertFalse(CameraFrame.objects.filter(pk=first_id).exists())

    def test_upload_keeps_a_manually_saved_frame(self):
        first_response = self.upload_frame()
        self.client.force_authenticate(user=self.user)
        self.client.post(
            reverse("experiment-save-latest-frame", args=[self.experiment.pk]),
            {"pot_number": 1},
            format="json",
        )
        self.client.force_authenticate(user=None)

        self.upload_frame()

        self.assertEqual(CameraFrame.objects.count(), 2)
        self.assertTrue(CameraFrame.objects.get(pk=first_response.data["id"]).is_saved)

    def test_anonymous_user_cannot_save_a_frame(self):
        self.upload_frame()

        response = self.client.post(
            reverse("experiment-save-latest-frame", args=[self.experiment.pk]),
            {"pot_number": 1},
            format="json",
        )

        self.assertIn(response.status_code, (401, 403))
        self.assertFalse(CameraFrame.objects.get().is_saved)

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
        other_pot = Pot.objects.create(
            experiment=self.experiment,
            treatment=self.treatment,
            label="P2",
            replicate_number=2,
            position=2,
        )
        ExperimentCameraAssignment.objects.create(
            experiment=self.experiment,
            pot=other_pot,
            camera=other_camera,
        )

        response = self.upload_frame(token="other-token")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(CameraFrame.objects.get().camera, other_camera)

    def test_upload_rejects_camera_not_assigned_to_a_pot(self):
        ExperimentCameraAssignment.objects.all().delete()

        response = self.upload_frame()

        self.assertEqual(response.status_code, 409)
        self.assertEqual(CameraFrame.objects.count(), 0)

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
        self.client.force_authenticate(user=self.user)
        self.upload_frame()

        response = self.client.get(
            reverse("experiment-latest-frame-image", args=[self.experiment.pk])
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"jpeg-data")
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_latest_frame_image_can_be_selected_by_pot(self):
        self.client.force_authenticate(user=self.user)
        self.upload_frame()

        response = self.client.get(
            reverse("experiment-latest-frame-image", args=[self.experiment.pk]),
            {"pot_number": 1},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"jpeg-data")

    def test_frame_image_endpoint_returns_uploaded_jpeg(self):
        self.client.force_authenticate(user=self.user)
        upload_response = self.upload_frame()

        response = self.client.get(
            reverse("camera-frame-image", args=[upload_response.data["id"]])
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"jpeg-data")

    def test_delete_removes_database_record(self):
        self.client.force_authenticate(user=self.user)
        
        upload_response = self.upload_frame()

        response = self.client.delete(
            reverse("camera-frame-delete", args=[upload_response.data["id"]])
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(CameraFrame.objects.count(), 0)

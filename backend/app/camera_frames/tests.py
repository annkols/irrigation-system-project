import shutil
import tempfile
from email.message import Message
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from experiments.models import Experiment

from .models import CameraFrame


class FakeCameraResponse:
    def __init__(self, body=b"jpeg-data", content_type="image/jpeg"):
        self.body = body
        self.headers = Message()
        self.headers["Content-Type"] = content_type

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, _size):
        body, self.body = self.body, b""
        return body

    def close(self):
        pass


class CameraFrameApiTests(APITestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.settings_override = override_settings(
            MEDIA_ROOT=self.media_root,
            CAMERA_JPG_URL="http://camera.local/jpg",
            CAMERA_STREAM_URL="http://camera.local:81/stream",
        )
        self.settings_override.enable()
        self.experiment = Experiment.objects.create(
            name="Test experiment",
            plant_name="Tomato",
            sensor_set_id=1,
        )

    def tearDown(self):
        self.settings_override.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)

    @patch("camera_frames.views.urlopen")
    def test_stream_is_proxied_through_backend(self, mocked_urlopen):
        mocked_urlopen.return_value = FakeCameraResponse(body=b"stream-data")

        response = self.client.get(reverse("camera-stream"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"stream-data")
        requested_url = mocked_urlopen.call_args.args[0].full_url
        self.assertEqual(requested_url, "http://camera.local:81/stream")

    @patch("camera_frames.views.urlopen")
    def test_capture_and_list_frame(self, mocked_urlopen):
        mocked_urlopen.return_value = FakeCameraResponse()

        capture_response = self.client.post(
            reverse("capture-frame", args=[self.experiment.pk]),
            {"note": "First frame"},
            format="json",
        )

        self.assertEqual(capture_response.status_code, 201)
        self.assertEqual(CameraFrame.objects.count(), 1)

        list_response = self.client.get(
            reverse("experiment-frame-list", args=[self.experiment.pk])
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["note"], "First frame")

    @patch("camera_frames.views.urlopen")
    def test_rejects_non_jpeg_response(self, mocked_urlopen):
        mocked_urlopen.return_value = FakeCameraResponse(content_type="text/html")

        response = self.client.post(
            reverse("capture-frame", args=[self.experiment.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(CameraFrame.objects.count(), 0)

    @patch("camera_frames.views.urlopen")
    def test_delete_removes_database_record(self, mocked_urlopen):
        mocked_urlopen.return_value = FakeCameraResponse()
        capture_response = self.client.post(
            reverse("capture-frame", args=[self.experiment.pk]),
            {},
            format="json",
        )

        response = self.client.delete(
            reverse("camera-frame-delete", args=[capture_response.data["id"]])
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(CameraFrame.objects.count(), 0)

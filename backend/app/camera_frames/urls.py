from django.urls import path

from .views import (
    CameraFrameDeleteView,
    CameraStreamView,
    CaptureFrameView,
    ExperimentFrameListView,
)


urlpatterns = [
    path("camera/stream/", CameraStreamView.as_view(), name="camera-stream"),
    path(
        "experiments/<int:experiment_id>/frames/",
        ExperimentFrameListView.as_view(),
        name="experiment-frame-list",
    ),
    path(
        "experiments/<int:experiment_id>/frames/capture/",
        CaptureFrameView.as_view(),
        name="capture-frame",
    ),
    path(
        "frames/<int:pk>/",
        CameraFrameDeleteView.as_view(),
        name="camera-frame-delete",
    ),
]

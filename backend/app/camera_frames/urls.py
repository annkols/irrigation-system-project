from django.urls import path

from .views import (
    CameraFrameDeleteView,
    CameraDeviceValidationView,
    CameraFrameImageView,
    CameraFrameUploadView,
    ExperimentFrameListView,
    LatestExperimentFrameImageView,
    SaveLatestExperimentFrameView,
)


urlpatterns = [
    path(
        "camera/devices/<int:pk>/validate/",
        CameraDeviceValidationView.as_view(),
        name="camera-device-validate",
    ),
    path(
        "camera/frames/upload/",
        CameraFrameUploadView.as_view(),
        name="camera-frame-upload",
    ),
    path(
        "experiments/<int:experiment_id>/frames/latest/image/",
        LatestExperimentFrameImageView.as_view(),
        name="experiment-latest-frame-image",
    ),
    path(
        "experiments/<int:experiment_id>/frames/latest/save/",
        SaveLatestExperimentFrameView.as_view(),
        name="experiment-save-latest-frame",
    ),
    path(
        "experiments/<int:experiment_id>/frames/",
        ExperimentFrameListView.as_view(),
        name="experiment-frame-list",
    ),
    path(
        "frames/<int:pk>/image/",
        CameraFrameImageView.as_view(),
        name="camera-frame-image",
    ),
    path(
        "frames/<int:pk>/",
        CameraFrameDeleteView.as_view(),
        name="camera-frame-delete",
    ),
]

from django.urls import path

from .views import (
    CameraFrameDeleteView,
    CameraFrameUploadView,
    ExperimentFrameListView,
    LatestExperimentFrameImageView,
)


urlpatterns = [
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
        "experiments/<int:experiment_id>/frames/",
        ExperimentFrameListView.as_view(),
        name="experiment-frame-list",
    ),
    path(
        "frames/<int:pk>/",
        CameraFrameDeleteView.as_view(),
        name="camera-frame-delete",
    ),
]

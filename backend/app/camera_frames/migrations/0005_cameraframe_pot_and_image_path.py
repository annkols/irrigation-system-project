from django.db import migrations, models
import django.db.models.deletion

import camera_frames.models


def backfill_frame_pots(apps, schema_editor):
    CameraFrame = apps.get_model("camera_frames", "CameraFrame")
    Assignment = apps.get_model("experiments", "ExperimentCameraAssignment")

    for assignment in Assignment.objects.all().iterator():
        CameraFrame.objects.filter(
            experiment_id=assignment.experiment_id,
            camera_id=assignment.camera_id,
            pot_id=None,
        ).update(pot_id=assignment.pot_id)


class Migration(migrations.Migration):

    dependencies = [
        ("camera_frames", "0004_cameraframe_camera"),
        ("experiments", "0008_alter_experiment_owner"),
    ]

    operations = [
        migrations.AddField(
            model_name="cameraframe",
            name="pot",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="camera_frames",
                to="experiments.pot",
            ),
        ),
        migrations.RunPython(backfill_frame_pots, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="cameraframe",
            name="image",
            field=models.ImageField(upload_to=camera_frames.models.camera_frame_upload_path),
        ),
    ]

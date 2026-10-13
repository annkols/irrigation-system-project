from django.db import migrations, models
from django.db.models import F


def preserve_existing_frames(apps, schema_editor):
    CameraFrame = apps.get_model("camera_frames", "CameraFrame")
    CameraFrame.objects.update(is_saved=True, saved_at=F("captured_at"))


class Migration(migrations.Migration):
    dependencies = [
        ("camera_frames", "0005_cameraframe_pot_and_image_path"),
    ]

    operations = [
        migrations.AddField(
            model_name="cameraframe",
            name="is_saved",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="cameraframe",
            name="saved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(preserve_existing_frames, migrations.RunPython.noop),
    ]

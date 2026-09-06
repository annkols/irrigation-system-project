from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("camera_frames", "0003_alter_cameradevice_sensor_set_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="cameraframe",
            name="camera",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="frames",
                to="camera_frames.cameradevice",
            ),
        ),
    ]

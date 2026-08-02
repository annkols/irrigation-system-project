from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("camera_frames", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CameraDevice",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                (
                    "sensor_set_id",
                    models.PositiveSmallIntegerField(
                        choices=[
                            (1, "Sensor set 1"),
                            (2, "Sensor set 2"),
                            (3, "Sensor set 3"),
                        ],
                        unique=True,
                    ),
                ),
                ("token_hash", models.CharField(editable=False, max_length=64)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]

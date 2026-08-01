from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_rename_scientific_unit_userprofile_department"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="university",
            field=models.CharField(blank=True, default="", max_length=150),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="userprofile",
            name="role",
            field=models.CharField(
                choices=[
                    ("student", "Student"),
                    ("doctoral_student", "Doctoral student"),
                    ("academic_employee", "Academic employee"),
                    ("administrative_worker", "Administrative worker"),
                    ("other", "Other"),
                ],
                default="other",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="profile_picture",
            field=models.ImageField(blank=True, upload_to="profile_pictures/"),
        ),
    ]

from django.db import migrations, models


def migrate_professor_role(apps, schema_editor):
    profile_model = apps.get_model("users", "CustomUserProfile")
    profile_model.objects.filter(role="professor").update(role="academic_employee")


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(migrate_professor_role, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="customuserprofile",
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
    ]

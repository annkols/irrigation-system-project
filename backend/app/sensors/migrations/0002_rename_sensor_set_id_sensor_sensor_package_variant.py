from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('sensors', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='sensor',
            old_name='sensor_set_id',
            new_name='sensor_package_variant',
        ),
    ]

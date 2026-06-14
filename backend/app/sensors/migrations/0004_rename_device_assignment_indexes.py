from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('sensors', '0003_sensordevice_sensordeviceassignment'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='sensordeviceassignment',
            new_name='sensors_sen_device__5a7157_idx',
            old_name='sensors_sen_device__bce508_idx',
        ),
        migrations.RenameIndex(
            model_name='sensordeviceassignment',
            new_name='sensors_sen_experim_9c9675_idx',
            old_name='sensors_sen_experim_22436b_idx',
        ),
    ]

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('experiments', '0005_rename_sensor_set_id_experiment_sensor_package_variant'),
        ('sensors', '0002_rename_sensor_set_id_sensor_sensor_package_variant'),
    ]

    operations = [
        migrations.CreateModel(
            name='SensorDevice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True)),
                ('name', models.CharField(blank=True, max_length=100)),
                ('max_sensor_package_variant', models.PositiveSmallIntegerField(default=3)),
                ('is_active', models.BooleanField(default=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['code'],
            },
        ),
        migrations.CreateModel(
            name='SensorDeviceAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('table_number', models.PositiveIntegerField()),
                ('pot_number', models.PositiveIntegerField()),
                ('assigned_from', models.DateTimeField()),
                ('assigned_to', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('device', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='sensors.sensordevice')),
                ('experiment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='device_assignments', to='experiments.experiment')),
            ],
            options={
                'ordering': ['table_number', 'pot_number'],
            },
        ),
        migrations.AddIndex(
            model_name='sensordeviceassignment',
            index=models.Index(fields=['device', 'assigned_from', 'assigned_to'], name='sensors_sen_device__bce508_idx'),
        ),
        migrations.AddIndex(
            model_name='sensordeviceassignment',
            index=models.Index(fields=['experiment', 'table_number', 'pot_number'], name='sensors_sen_experim_22436b_idx'),
        ),
        migrations.AddConstraint(
            model_name='sensordeviceassignment',
            constraint=models.UniqueConstraint(fields=('experiment', 'table_number', 'pot_number'), name='unique_device_assignment_per_experiment_pot'),
        ),
    ]

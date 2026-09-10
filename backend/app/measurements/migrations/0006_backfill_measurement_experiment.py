from collections import defaultdict

from django.db import migrations


def backfill_measurement_experiment(apps, schema_editor):
    Experiment = apps.get_model('experiments', 'Experiment')
    Measurement = apps.get_model('measurements', 'Measurement')

    experiments_by_station = defaultdict(list)
    for experiment in Experiment.objects.exclude(started_at=None).iterator():
        end_at = experiment.finished_at or experiment.planned_end_at
        if end_at is not None:
            experiments_by_station[experiment.sensor_set_id].append(
                (experiment.id, experiment.started_at, end_at)
            )

    pending = []
    measurements = Measurement.objects.filter(experiment=None).only(
        'id', 'station_number', 'created_at', 'experiment'
    )
    for measurement in measurements.iterator(chunk_size=1000):
        matches = [
            experiment_id
            for experiment_id, started_at, end_at
            in experiments_by_station[measurement.station_number]
            if started_at <= measurement.created_at <= end_at
        ]
        if len(matches) == 1:
            measurement.experiment_id = matches[0]
            pending.append(measurement)

        if len(pending) == 1000:
            Measurement.objects.bulk_update(pending, ['experiment'])
            pending.clear()

    if pending:
        Measurement.objects.bulk_update(pending, ['experiment'])


class Migration(migrations.Migration):

    dependencies = [
        ('measurements', '0005_measurement_experiment'),
    ]

    operations = [
        migrations.RunPython(
            backfill_measurement_experiment,
            migrations.RunPython.noop,
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("experiments", "0003_experiment_sensor_frequencies"),
    ]

    operations = [
        migrations.CreateModel(
            name="Keyword",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(db_index=True, max_length=50, unique=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.AddField(
            model_name="experiment",
            name="keywords",
            field=models.ManyToManyField(blank=True, related_name="experiments", to="experiments.keyword"),
        ),
    ]

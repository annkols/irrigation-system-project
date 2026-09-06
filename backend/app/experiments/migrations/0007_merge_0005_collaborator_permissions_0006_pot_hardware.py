from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("experiments", "0005_collaborator_permissions"),
        (
            "experiments",
            "0006_remove_pothardwareassignment_unique_component_identifier_per_pot",
        ),
    ]

    operations = []

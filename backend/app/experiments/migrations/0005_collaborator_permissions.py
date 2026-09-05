from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def get_old_m2m_fields(Experiment):
    old_through = (
        Experiment
        ._meta
        .get_field("collaborators")
        .remote_field
        .through
    )

    experiment_fk = next(
        field
        for field in old_through._meta.fields
        if field.many_to_one
        and field.remote_field.model._meta.label_lower
        == "experiments.experiment"
    )

    user_fk = next(
        field
        for field in old_through._meta.fields
        if field.many_to_one
        and field.name != experiment_fk.name
    )

    return old_through, experiment_fk, user_fk


def copy_collaborators_forward(apps, schema_editor):
    Experiment = apps.get_model(
        "experiments",
        "Experiment",
    )

    ExperimentCollaborator = apps.get_model(
        "experiments",
        "ExperimentCollaborator",
    )

    old_through, experiment_fk, user_fk = (
        get_old_m2m_fields(Experiment)
    )

    db_alias = schema_editor.connection.alias

    memberships = []

    for relation in (
        old_through.objects
        .using(db_alias)
        .all()
        .iterator()
    ):
        memberships.append(
            ExperimentCollaborator(
                experiment_id=getattr(
                    relation,
                    experiment_fk.attname,
                ),
                user_id=getattr(
                    relation,
                    user_fk.attname,
                ),
            )
        )

    ExperimentCollaborator.objects.using(
        db_alias
    ).bulk_create(
        memberships,
        ignore_conflicts=True,
    )


def copy_collaborators_backward(apps, schema_editor):
    Experiment = apps.get_model(
        "experiments",
        "Experiment",
    )

    ExperimentCollaborator = apps.get_model(
        "experiments",
        "ExperimentCollaborator",
    )

    old_through, experiment_fk, user_fk = (
        get_old_m2m_fields(Experiment)
    )

    db_alias = schema_editor.connection.alias

    old_relations = []

    for membership in (
        ExperimentCollaborator.objects
        .using(db_alias)
        .all()
        .iterator()
    ):
        old_relations.append(
            old_through(
                **{
                    experiment_fk.attname:
                        membership.experiment_id,
                    user_fk.attname:
                        membership.user_id,
                }
            )
        )

    old_through.objects.using(
        db_alias
    ).bulk_create(
        old_relations,
        ignore_conflicts=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        (
            "experiments",
            "0004_keyword_experiment_keywords",
        ),
    ]

    operations = [
        migrations.CreateModel(
            name="ExperimentCollaborator",
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
                (
                    "can_edit_experiment",
                    models.BooleanField(
                        default=False,
                    ),
                ),
                (
                    "can_end_experiment",
                    models.BooleanField(
                        default=False,
                    ),
                ),
                (
                    "added_at",
                    models.DateTimeField(
                        auto_now_add=True,
                    ),
                ),
                (
                    "experiment",
                    models.ForeignKey(
                        on_delete=(
                            django.db.models.deletion.CASCADE
                        ),
                        related_name=(
                            "collaborator_memberships"
                        ),
                        to="experiments.experiment",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=(
                            django.db.models.deletion.CASCADE
                        ),
                        related_name=(
                            "experiment_memberships"
                        ),
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=(
                            "experiment",
                            "user",
                        ),
                        name=(
                            "unique_experiment_collaborator"
                        ),
                    ),
                ],
            },
        ),

        migrations.RunPython(
            copy_collaborators_forward,
            copy_collaborators_backward,
        ),

        migrations.RemoveField(
            model_name="experiment",
            name="collaborators",
        ),

        migrations.AddField(
            model_name="experiment",
            name="collaborators",
            field=models.ManyToManyField(
                blank=True,
                related_name=(
                    "collaborated_experiments"
                ),
                through=(
                    "experiments."
                    "ExperimentCollaborator"
                ),
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
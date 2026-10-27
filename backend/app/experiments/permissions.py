from rest_framework.permissions import BasePermission

from .models import ExperimentCollaborator
from notes.models import Note

# PERMISSIONS FOR EXPERIMENTS AND COLLABORATORS
def get_experiment(obj):
    return getattr(obj, "experiment", obj)


class IsExperimentOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        experiment = get_experiment(obj)

        return (
            request.user.is_authenticated
            and experiment.owner_id == request.user.id
        )


class IsExperimentOwnerOrCollaborator(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        experiment = get_experiment(obj)

        if experiment.owner_id == request.user.id:
            return True

        return ExperimentCollaborator.objects.filter(
            experiment=experiment,
            user=request.user,
        ).exists()


class CanViewExperiment(BasePermission):
    def has_object_permission(self, request, view, obj):
        experiment = get_experiment(obj)

        if experiment.is_public:
            return True

        if not request.user.is_authenticated:
            return False

        if experiment.owner_id == request.user.id:
            return True

        return ExperimentCollaborator.objects.filter(
            experiment=experiment,
            user=request.user,
        ).exists()


class CanEditExperiment(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        experiment = get_experiment(obj)

        if experiment.owner_id == request.user.id:
            return True

        return ExperimentCollaborator.objects.filter(
            experiment=experiment,
            user=request.user,
            can_edit_experiment=True,
        ).exists()


class CanEndExperiment(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        experiment = get_experiment(obj)

        if experiment.owner_id == request.user.id:
            return True

        return ExperimentCollaborator.objects.filter(
            experiment=experiment,
            user=request.user,
            can_end_experiment=True,
        ).exists()

class CanAddNotes(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        experiment = get_experiment(obj)

        if experiment.owner_id == request.user.id:
            return True

        return ExperimentCollaborator.objects.filter(
            experiment=experiment,
            user=request.user,
            can_add_notes=True,
        ).exists()


def can_modify_note(user, obj, permission):
    if not user.is_authenticated:
        return False

    note = getattr(obj, "note", obj)
    experiment = note.experiment

    if experiment.owner_id == user.pk:
        return True

    if note.author_id != user.pk:
        return False

    return ExperimentCollaborator.objects.filter(
        experiment=experiment,
        user=user,
        **{permission: True}
    ).exists()

class CanEditNotes(BasePermission):
    def has_object_permission(self, request, view, obj):
        return can_modify_note(
            request.user,
            obj,
            "can_edit_notes"
        )

class CanDeleteNotes(BasePermission):
    def has_object_permission(self, request, view, obj):
        return can_modify_note(
            request.user,
            obj,
            "can_delete_notes"
        )

class CanManageFrames(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        experiment = get_experiment(obj)

        if experiment.owner_id == request.user.id:
            return True

        return ExperimentCollaborator.objects.filter(
            experiment=experiment,
            user=request.user,
            can_manage_frames=True
        ).exists()

class CanControlPump(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        experiment = get_experiment(obj)

        if experiment.owner_id == request.user.id:
            return True

        return ExperimentCollaborator.objects.filter(
            experiment=experiment,
            user=request.user,
            can_control_pump=True
        ).exists()


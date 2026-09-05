from rest_framework.permissions import BasePermission

from .models import ExperimentCollaborator

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
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import ExperimentCollaborator, CollaboratorEventNotification

@receiver(post_save, sender=ExperimentCollaborator)
def notify_collaborator_added(sender, instance, created, **kwargs):
    if created:
        CollaboratorEventNotification.objects.create(
            experiment=instance.experiment,
            user=instance.user,
            event_type="added"
        )

@receiver(pre_delete, sender=ExperimentCollaborator)
def notify_collaborator_removed(sender, instance, **kwargs):
    CollaboratorEventNotification.objects.create(
        experiment=instance.experiment,
        user=instance.user,
        event_type="removed"
    )
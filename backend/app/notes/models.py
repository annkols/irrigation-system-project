from django.db import models
from experiments.models import Experiment


class Note(models.Model):
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name='notes',
    )
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    image = models.FileField(upload_to='notes/%Y/%m/%d/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.experiment.name} — {self.title}"

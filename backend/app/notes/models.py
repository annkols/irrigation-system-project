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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.experiment.name} — {self.title}"

    def delete(self, *args, **kwargs):
        images = list(self.images.all())
        super().delete(*args, **kwargs)
        for note_image in images:
            if note_image.image:
                note_image.image.delete(save=False)


class NoteImage(models.Model):
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='images',
    )
    image = models.ImageField(upload_to='notes/%Y/%m/%d/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at', 'id']

    def __str__(self):
        return f"Image {self.pk} — {self.note.title}"

    @property
    def experiment(self):
        return self.note.experiment

    def delete(self, *args, **kwargs):
        image = self.image
        super().delete(*args, **kwargs)
        if image:
            image.delete(save=False)

from django.contrib import admin
from .models import Note, NoteImage


class NoteImageInline(admin.TabularInline):
    model = NoteImage
    extra = 1


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'experiment', 'created_at', 'updated_at')
    list_filter = ('experiment',)
    search_fields = ('title', 'content')
    inlines = [NoteImageInline]

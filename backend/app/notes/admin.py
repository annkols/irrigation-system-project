from django.contrib import admin
from .models import Note, NoteAttachment, NoteImage


class NoteImageInline(admin.TabularInline):
    model = NoteImage
    extra = 1


class NoteAttachmentInline(admin.TabularInline):
    model = NoteAttachment
    extra = 0
    readonly_fields = ('original_name', 'size', 'uploaded_at')


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'experiment', 'created_at', 'updated_at')
    list_filter = ('experiment',)
    search_fields = ('title', 'content')
    inlines = [NoteImageInline, NoteAttachmentInline]

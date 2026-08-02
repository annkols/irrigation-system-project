from django.contrib import admin
from django.contrib import messages

from .models import CameraDevice, CameraFrame


@admin.register(CameraDevice)
class CameraDeviceAdmin(admin.ModelAdmin):
    list_display = ("name", "sensor_set_id", "is_active", "created_at")
    list_filter = ("is_active", "sensor_set_id")
    search_fields = ("name",)
    readonly_fields = ("created_at",)
    actions = ("regenerate_token",)

    def save_model(self, request, obj, form, change):
        generated_token = None
        if not change and not obj.token_hash:
            generated_token = obj.generate_token(save=False)

        super().save_model(request, obj, form, change)

        if generated_token:
            self.message_user(
                request,
                f"Copy this token now; it will not be shown again: {generated_token}",
                level=messages.WARNING,
            )

    @admin.action(description="Generate a new upload token")
    def regenerate_token(self, request, queryset):
        for device in queryset:
            token = device.generate_token()
            self.message_user(
                request,
                f"New token for {device.name} (copy it now): {token}",
                level=messages.WARNING,
            )


admin.site.register(CameraFrame)

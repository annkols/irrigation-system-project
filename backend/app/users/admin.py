from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .forms import CustomUserCreationForm, CustomUserChangeForm
from .models import CustomUser, CustomUserProfile


class CustomUserProfileInline(admin.StackedInline):
    model = CustomUserProfile
    can_delete = False
    extra = 0


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomUser

    inlines = (CustomUserProfileInline,)

    list_display = (
        "id",
        "username",
        "email",
        "first_name",
        "last_name",
        "is_active",
        "is_staff",
        "is_superuser",
    )

    search_fields = (
        "username",
        "first_name",
        "last_name",
        "email",
    )

    list_filter = (
        "is_active",
        "is_staff",
        "is_superuser",
    )

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)

        if request.user.is_superuser:
            return fieldsets

        restricted_fields = {
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        }

        cleaned_fieldsets = []

        for title, options in fieldsets:
            fields = options.get("fields", ())

            cleaned_fields = []
            for field in fields:
                # tuples
                if isinstance(field, tuple):
                    cleaned_tuple = tuple(
                        item for item in field
                        if item not in restricted_fields
                    )
                    if cleaned_tuple:
                        cleaned_fields.append(cleaned_tuple)

                # strings
                elif field not in restricted_fields:
                    cleaned_fields.append(field)

            cleaned_options = {
                **options,
                "fields": tuple(cleaned_fields),
            }

            cleaned_fieldsets.append((title, cleaned_options))

        return cleaned_fieldsets

    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(super().get_readonly_fields(request, obj))

        if not request.user.is_superuser:
            readonly_fields.extend([
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            ])

        return readonly_fields

    def has_change_permission(self, request, obj=None):
        has_permission = super().has_change_permission(request, obj)

        if not has_permission:
            return False

        if obj is None:
            return True

        if not request.user.is_superuser and obj.is_superuser:
            return False

        if not request.user.is_superuser and obj.is_staff:
            return False

        return True

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
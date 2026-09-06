from rest_framework.permissions import BasePermission

from django.contrib.auth import get_user_model

User = get_user_model()

class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )

class CanViewUsers(BasePermission):
    def has_permission(self, request, view):
        permission = (f"{User._meta.app_label}.view_{User._meta.model_name}")

        return (
            request.user.is_authenticated
            and request.user.is_staff
            and request.user.has_perm(permission)
        )

class CanChangeUsers(BasePermission):
    def has_permission(self, request, view):
        permission = (f"{User._meta.app_label}.change_{User._meta.model_name}")

        return (
            request.user.is_authenticated
            and request.user.is_staff
            and request.user.has_perm(permission)
        )
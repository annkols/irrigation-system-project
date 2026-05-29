from django.contrib import admin
from .models import UserProfile

# Register your models here.
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'department')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__email', 'department')

# users/forms.py

from django.contrib.auth.forms import AdminUserCreationForm, UserChangeForm
from django import forms

from .models import CustomUser, CustomUserProfile

# CustomUser
class CustomUserCreationForm(AdminUserCreationForm):
    class Meta(AdminUserCreationForm.Meta):
        model = CustomUser
        fields = ("username", "email", "first_name", "last_name")

class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = CustomUser
        fields = "__all__"


# CustomUserProfile
class CustomUserProfileForm(forms.ModelForm):
    class Meta:
        model = CustomUserProfile
        fields = ("university", "department", "role", "profile_picture")
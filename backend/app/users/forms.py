# users/forms.py

from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AdminUserCreationForm, UserChangeForm
from django import forms

from .models import UserProfile

User = get_user_model()

# CustomUser
class CustomUserCreationForm(AdminUserCreationForm):
    class Meta(AdminUserCreationForm.Meta):
        model = User
        fields = ("username", "email", "first_name", "last_name")

class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"


# UserProfile
class UserProfileForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ("university", "department", "role", "profile_picture")

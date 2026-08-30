from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from .models import UserProfile

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["university", "department", "role", "profile_picture"]

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "profile", "is_active", "is_staff"]


class UserSearchSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "profile"]
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, write_only=True)
    password = serializers.CharField(required=True, write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        user = User.objects.filter(email__iexact=email).first()

        if user is None or not user.check_password(attrs["password"]):
            raise AuthenticationFailed("Invalid email or password.")

        if not user.is_active:
            raise PermissionDenied("Account is waiting for administrator approval.")

        attrs["user"] = user
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True, write_only=True)

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)

    password = serializers.CharField(write_only=True, required=True)
    university = serializers.CharField(write_only=True, required=True)
    department = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=UserProfile.Role.choices, write_only=True)
    profile_picture = serializers.ImageField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "university",
            "department",
            "role",
            "profile_picture",
        ]

    def validate_password(self, value):
        validate_password(value)
        return value
    
    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "E-mail address has already been assigned to an account."
            )
        return value

    # frontend ma lokalnie przechowywać dane podczas rejestracji po stronie klienta - po zebraniu wszystkich danych - wyslac je serwerowi 
    def create(self, validated_data):
        university = validated_data.pop("university")
        department = validated_data.pop("department")
        role = validated_data.pop("role")
        profile_picture = validated_data.pop("profile_picture", None)

        password = validated_data.pop("password")

        with transaction.atomic():
            user = User(
                **validated_data,
                is_active=False,
                is_staff=False,
                is_superuser=False
            )
            user.set_password(password)
            user.save()

            profile_data = {
                "user": user,
                "university": university,
                "department": department,
                "role": role,
                        }
            
            if profile_picture:
                profile_data["profile_picture"] = profile_picture

            UserProfile.objects.create(**profile_data)

        return user

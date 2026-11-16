from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


class UserRoleManagementTests(APITestCase):

    def setUp(self):

        self.superuser = User.objects.create_superuser(
            username="superuser",
            email="superuser@example.com",
            password="SuperPass123!",
        )

        self.administrator = User.objects.create_user(
            username="administrator",
            email="administrator@example.com",
            password="AdminPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        self.regular_user = User.objects.create_user(
            username="regular.user",
            email="regular@example.com",
            password="UserPass123!",
            is_active=True,
            is_staff=False,
            is_superuser=False,
        )

        content_type = ContentType.objects.get_for_model(User)

        change_user_permission = Permission.objects.get(
            content_type=content_type,
            codename=f"change_{User._meta.model_name}",
        )

        self.administrator.user_permissions.add(change_user_permission)


    def new_user(self, **overrides):

        user_data = {
            "username": "anna.nowak",
            "email": "anna.nowak@example.com",
            "password": "Z9!vQ2#pL7@xpass",
            "is_active": True,
            "is_staff": False,
            "is_superuser": False,
        }

        user_data.update(overrides)
        return User.objects.create_user(**user_data)


    def authenticate(self, user):

        access = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")


    def test_superuser_can_activate_user(self):

        user = self.new_user(is_active=False)
        self.authenticate(self.superuser)

        response = self.client.patch(
            reverse("user-activate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertTrue(user.is_active)


    def test_admin_staff_cannot_activate_superuser(self):

        user = self.new_user(
            is_active=False,
            is_staff=True,
            is_superuser=True,
        )
        self.authenticate(self.administrator)

        response = self.client.patch(
            reverse("user-activate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        user.refresh_from_db()
        self.assertFalse(user.is_active)


    def test_admin_staff_cannot_activate_admin(self):

        user = self.new_user(is_active=False, is_staff=True)
        self.authenticate(self.administrator)

        response = self.client.patch(
            reverse("user-activate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        user.refresh_from_db()
        self.assertFalse(user.is_active)


    def test_admin_staff_can_activate_user(self):

        user = self.new_user(is_active=False)
        self.authenticate(self.administrator)

        response = self.client.patch(
            reverse("user-activate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertTrue(user.is_active)


    def test_regular_user_cannot_activate_user(self):

        user = self.new_user(is_active=False)
        self.authenticate(self.regular_user)

        response = self.client.patch(
            reverse("user-activate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        user.refresh_from_db()
        self.assertFalse(user.is_active)


    def test_anonymous_cannot_activate_user(self):

        user = self.new_user(is_active=False)

        response = self.client.patch(
            reverse("user-activate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        user.refresh_from_db()
        self.assertFalse(user.is_active)


    def test_superuser_can_deactivate_user(self):

        user = self.new_user(is_active=True)
        self.authenticate(self.superuser)

        response = self.client.patch(
            reverse("user-deactivate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertFalse(user.is_active)


    def test_admin_staff_cannot_deactivate_superuser(self):

        user = self.new_user(
            is_active=True,
            is_staff=True,
            is_superuser=True,
        )
        self.authenticate(self.administrator)

        response = self.client.patch(
            reverse("user-deactivate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        user.refresh_from_db()
        self.assertTrue(user.is_active)


    def test_admin_staff_cannot_deactivate_admin(self):

        user = self.new_user(is_active=True, is_staff=True)
        self.authenticate(self.administrator)

        response = self.client.patch(
            reverse("user-deactivate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        user.refresh_from_db()
        self.assertTrue(user.is_active)


    def test_admin_staff_can_deactivate_user(self):

        user = self.new_user(is_active=True)
        self.authenticate(self.administrator)

        response = self.client.patch(
            reverse("user-deactivate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertFalse(user.is_active)


    def test_regular_user_cannot_deactivate_user(self):

        user = self.new_user(is_active=True)
        self.authenticate(self.regular_user)

        response = self.client.patch(
            reverse("user-deactivate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        user.refresh_from_db()
        self.assertTrue(user.is_active)


    def test_anonymous_cannot_deactivate_user(self):

        user = self.new_user(is_active=True)

        response = self.client.patch(
            reverse("user-deactivate", args=[user.pk]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        user.refresh_from_db()
        self.assertTrue(user.is_active)


    def test_superuser_cannot_delete_self(self):

        self.authenticate(self.superuser)

        response = self.client.delete(
            reverse("user-delete", args=[self.superuser.pk])
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(pk=self.superuser.pk).exists())

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

# Create your tests here.
User = get_user_model()

class UserValidationTests(APITestCase):

    # SUPERUSER ACTIVATES INACTIVE ACCOUNT -> 200
    def test_superuser_can_activate_user(self):
        inactive_user = User.objects.create_user(
            username="inactive.user",
            email="inactive@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=False,
        )
        superuser = User.objects.create_user(
            username="superuser",
            email="superuser@example.com",
            password="AdminPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=True,
        )

        superuser_access = RefreshToken.for_user(superuser).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {superuser_access}")

        response = self.client.patch(reverse("user-activate", args=[inactive_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inactive_user.refresh_from_db()
        self.assertTrue(inactive_user.is_active)

    # ADMINISTRATOR WITH PERMISSIONS CANNOT ACTIVATE SUPERUSER -> 403
    def test_admin_staff_cannot_activate_superuser(self):
        inactive_user = User.objects.create_user(
            username="super.user",
            email="superuser@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=False,
            is_staff=True,
            is_superuser=False
        )

        administrator = User.objects.create_user(
            username="administrator",
            email="administrator@example.com",
            password="AdminPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        content_type = ContentType.objects.get_for_model(User)

        change_user_permission = Permission.objects.get(
            content_type=content_type,
            codename=f"change_{User._meta.model_name}",
        )

        administrator.user_permissions.add(change_user_permission)

        admin_access = RefreshToken.for_user(administrator).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_access}")

        response = self.client.patch(reverse("user-activate", args=[inactive_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        inactive_user.refresh_from_db()
        self.assertFalse(inactive_user.is_active)


    # ADMINISTRATOR WITH PERMISSIONS CANNOT ACTIVATE ADMIN -> 403
    def test_admin_staff_cannot_activate_admin(self):
        active_user = User.objects.create_user(
            username="admin.user",
            email="admin@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=False,
            is_staff=True
        )

        administrator = User.objects.create_user(
            username="administrator",
            email="administrator@example.com",
            password="AdminPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        content_type = ContentType.objects.get_for_model(User)

        change_user_permission = Permission.objects.get(
            content_type=content_type,
            codename=f"change_{User._meta.model_name}",
        )

        administrator.user_permissions.add(change_user_permission)

        admin_access = RefreshToken.for_user(administrator).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_access}")

        response = self.client.patch(reverse("user-activate", args=[active_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        active_user.refresh_from_db()
        self.assertFalse(active_user.is_active)


    # ADMINISTRATOR WITH PERMISSIONS ACTIVATES INACTIVE ACCOUNT -> 200
    def test_admin_staff_can_activate_user(self):
        inactive_user = User.objects.create_user(
            username="inactive.user",
            email="inactive@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=False,
        )

        administrator = User.objects.create_user(
            username="administrator",
            email="administrator@example.com",
            password="AdminPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        content_type = ContentType.objects.get_for_model(User)

        change_user_permission = Permission.objects.get(
            content_type=content_type,
            codename=f"change_{User._meta.model_name}",
        )

        administrator.user_permissions.add(change_user_permission)

        admin_access = RefreshToken.for_user(administrator).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_access}")

        response = self.client.patch(reverse("user-activate", args=[inactive_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        inactive_user.refresh_from_db()
        self.assertTrue(inactive_user.is_active)


    # REGULAR USER CANNOT ACTIVATE INACTIVE ACCOUNT -> 403
    def test_regular_user_cannot_activate_user(self):
        inactive_user = User.objects.create_user(
            username="inactive.user",
            email="inactive@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=False,
        )

        regular_user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="UserPass123!",
            is_active=True,
            is_staff=False,
            is_superuser=False,
        )

        user_access = RefreshToken.for_user(regular_user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {user_access}")

        response = self.client.patch(reverse("user-activate", args=[inactive_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        inactive_user.refresh_from_db()
        self.assertFalse(inactive_user.is_active)


    # ANONYMOUS CANNOT ACTIVATE INACTIVE ACCOUNT -> 403
    def test_anonymous_cannot_activate_user(self):
        inactive_user = User.objects.create_user(
            username="inactive.user",
            email="inactive@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=False,
        )

        response = self.client.patch(reverse("user-deactivate", args=[inactive_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        inactive_user.refresh_from_db()
        self.assertFalse(inactive_user.is_active)


    # SUPERUSER DEACTIVATES INACTIVE ACCOUNT -> 200
    def test_superuser_can_deactivate_user(self):
        active_user = User.objects.create_user(
            username="inactive.user",
            email="inactive@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=True,
        )
        superuser = User.objects.create_user(
            username="superuser",
            email="superuser@example.com",
            password="AdminPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=True,
        )

        superuser_access = RefreshToken.for_user(superuser).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {superuser_access}")

        response = self.client.patch(reverse("user-deactivate", args=[active_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        active_user.refresh_from_db()
        self.assertFalse(active_user.is_active)


    # ADMINISTRATOR WITH PERMISSIONS CANNOT DEACTIVATE SUPERUSER -> 403
    def test_admin_staff_cannot_deactivate_superuser(self):
        active_user = User.objects.create_user(
            username="super.user",
            email="superuser@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=True,
            is_staff=True,
            is_superuser=True
        )

        administrator = User.objects.create_user(
            username="administrator",
            email="administrator@example.com",
            password="AdminPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        content_type = ContentType.objects.get_for_model(User)

        change_user_permission = Permission.objects.get(
            content_type=content_type,
            codename=f"change_{User._meta.model_name}",
        )

        administrator.user_permissions.add(change_user_permission)

        admin_access = RefreshToken.for_user(administrator).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_access}")

        response = self.client.patch(reverse("user-deactivate", args=[active_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        active_user.refresh_from_db()
        self.assertTrue(active_user.is_active)


    # ADMINISTRATOR WITH PERMISSIONS CANNOT DEACTIVATE ADMIN -> 403
    def test_admin_staff_cannot_deactivate_admin(self):
        active_user = User.objects.create_user(
            username="admin.user",
            email="admin@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=True,
            is_staff=True
        )

        administrator = User.objects.create_user(
            username="administrator",
            email="administrator@example.com",
            password="AdminPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        content_type = ContentType.objects.get_for_model(User)

        change_user_permission = Permission.objects.get(
            content_type=content_type,
            codename=f"change_{User._meta.model_name}",
        )

        administrator.user_permissions.add(change_user_permission)

        admin_access = RefreshToken.for_user(administrator).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_access}")

        response = self.client.patch(reverse("user-deactivate", args=[active_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        active_user.refresh_from_db()
        self.assertTrue(active_user.is_active)


    # ADMINISTRATOR WITH PERMISSIONS DEACTIVATES ACTIVE ACCOUNT -> 200
    def test_admin_staff_can_deactivate_user(self):
        active_user = User.objects.create_user(
            username="active.user",
            email="active@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=True,
        )

        administrator = User.objects.create_user(
            username="administrator",
            email="administrator@example.com",
            password="AdminPass123!",
            is_active=True,
            is_staff=True,
            is_superuser=False,
        )

        content_type = ContentType.objects.get_for_model(User)

        change_user_permission = Permission.objects.get(
            content_type=content_type,
            codename=f"change_{User._meta.model_name}",
        )

        administrator.user_permissions.add(change_user_permission)

        admin_access = RefreshToken.for_user(administrator).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_access}")

        response = self.client.patch(reverse("user-deactivate", args=[active_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        active_user.refresh_from_db()
        self.assertFalse(active_user.is_active)


    # REGULAR USER CANNOT DEACTIVATE INACTIVE ACCOUNT -> 403
    def test_regular_user_cannot_deactivate_user(self):
        active_user = User.objects.create_user(
            username="active.user",
            email="active@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=True,
        )

        regular_user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="UserPass123!",
            is_active=True,
            is_staff=False,
            is_superuser=False,
        )

        user_access = RefreshToken.for_user(regular_user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {user_access}")

        response = self.client.patch(reverse("user-deactivate", args=[active_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        active_user.refresh_from_db()
        self.assertTrue(active_user.is_active)


    # ANONYMOUS CANNOT DEACTIVATE INACTIVE ACCOUNT -> 403
    def test_anonymous_cannot_deactivate_user(self):
        active_user = User.objects.create_user(
            username="active.user",
            email="active@example.com",
            password="Z9!vQ2#pL7@xpass",
            is_active=True,
        )

        response = self.client.patch(reverse("user-deactivate", args=[active_user.pk]), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        active_user.refresh_from_db()
        self.assertTrue(active_user.is_active)


    # SUPERUSER CANNOT DELETE THEMSELVES -> 400
    def test_superuser_cannot_delete_self(self):
        admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="AdminPass123!",
        )

        access = RefreshToken.for_user(admin).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.delete(reverse("user-delete", args=[admin.pk]))

        self.assertEqual(response.status_code,status.HTTP_400_BAD_REQUEST,)

        self.assertTrue(User.objects.filter(pk=admin.pk).exists())
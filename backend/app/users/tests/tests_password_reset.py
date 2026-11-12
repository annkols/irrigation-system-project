
from urllib.parse import parse_qs, urlsplit

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_RESET_FRONTEND_URL="http://localhost:5173/reset-password",
)
class PasswordResetTests(APITestCase):

    def setUp(self):

        cache.clear()

        self.request_url = reverse("auth-password-reset")
        self.confirm_url = reverse("auth-password-reset-confirm")

        self.user = User.objects.create_user(
            username="reset.user",
            email="reset@example.com",
            password="OldPassword123!",
            is_active=True,
        )

    def reset_payload(self, **overrides):

        payload = {
            "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
            "token": default_token_generator.make_token(self.user),
            "new_password1": "NewPassword456!",
            "new_password2": "NewPassword456!",
        }

        payload.update(overrides)
        return payload

    def test_english_email_uses_english_templates(self):

        response = self.client.post(
            self.request_url,
            {"email": self.user.email, "language": "en"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertEqual(
            mail.outbox[0].subject,
            "Plantstalker - Reset your password",
        )
        self.assertIn(
            "You requested a password reset",
            mail.outbox[0].body,
        )
        self.assertIn(
            "http://localhost:5173/reset-password?uid=",
            mail.outbox[0].body,
        )
        self.assertIn("&token=", mail.outbox[0].body)

    def test_polish_email_uses_polish_templates(self):

        response = self.client.post(
            self.request_url,
            {"email": self.user.email, "language": "pl"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].subject,
            "Plantstalker - Zresetuj swoje hasło",
        )
        self.assertIn(
            "Otrzymaliśmy prośbę o zresetowanie hasła",
            mail.outbox[0].body,
        )
        self.assertIn(
            "http://localhost:5173/reset-password?uid=",
            mail.outbox[0].body,
        )

    def test_default_language_is_english(self):

        response = self.client.post(
            self.request_url,
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].subject,
            "Plantstalker - Reset your password",
        )

    def test_unknown_account_gets_generic_response_without_email(self):

        response = self.client.post(
            self.request_url,
            {
                "email": "unknown@example.com",
                "language": "en",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

        known_response = self.client.post(
            self.request_url,
            {"email": self.user.email, "language": "en"},
            format="json",
        )

        self.assertEqual(known_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["detail"],
            known_response.data["detail"],
        )

    def test_inactive_account_does_not_receive_email(self):

        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            self.request_url,
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_account_with_unusable_password_does_not_receive_email(self):

        self.user.set_unusable_password()
        self.user.save(update_fields=["password"])

        response = self.client.post(
            self.request_url,
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_invalid_email_is_rejected(self):

        response = self.client.post(
            self.request_url,
            {
                "email": "not-an-email",
                "language": "en",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("email", response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_unsupported_language_is_rejected(self):

        response = self.client.post(
            self.request_url,
            {
                "email": self.user.email,
                "language": "de",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("language", response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_valid_token_changes_password_and_cannot_be_reused(self):

        payload = self.reset_payload()

        response = self.client.post(
            self.confirm_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()

        self.assertTrue(
            self.user.check_password("NewPassword456!")
        )
        self.assertFalse(
            self.user.check_password("OldPassword123!")
        )
        self.assertFalse(
            default_token_generator.check_token(
                self.user,
                payload["token"],
            )
        )

        reused_response = self.client.post(
            self.confirm_url,
            payload,
            format="json",
        )

        self.assertEqual(
            reused_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_email_link_can_be_used_to_reset_password(self):

        request_response = self.client.post(
            self.request_url,
            {"email": self.user.email, "language": "en"},
            format="json",
        )

        self.assertEqual(
            request_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(len(mail.outbox), 1)

        reset_link = next(
            line.strip()
            for line in mail.outbox[0].body.splitlines()
            if line.strip().startswith(
                "http://localhost:5173/reset-password?"
            )
        )

        query = parse_qs(urlsplit(reset_link).query)

        confirm_response = self.client.post(
            self.confirm_url,
            {
                "uid": query["uid"][0],
                "token": query["token"][0],
                "new_password1": "NewPassword456!",
                "new_password2": "NewPassword456!",
            },
            format="json",
        )

        self.assertEqual(
            confirm_response.status_code,
            status.HTTP_200_OK,
        )

        self.user.refresh_from_db()
        self.assertTrue(
            self.user.check_password("NewPassword456!")
        )

    def test_invalid_token_is_rejected(self):

        response = self.client.post(
            self.confirm_url,
            self.reset_payload(token="invalid-token"),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.user.refresh_from_db()
        self.assertTrue(
            self.user.check_password("OldPassword123!")
        )

    def test_invalid_uid_is_rejected(self):

        response = self.client.post(
            self.confirm_url,
            self.reset_payload(uid="not-a-valid-uid"),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.user.refresh_from_db()
        self.assertTrue(
            self.user.check_password("OldPassword123!")
        )

    def test_missing_uid_or_token_is_rejected(self):

        for missing_field in ("uid", "token"):

            with self.subTest(missing_field=missing_field):

                payload = self.reset_payload()
                payload.pop(missing_field)

                response = self.client.post(
                    self.confirm_url,
                    payload,
                    format="json",
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )

        self.user.refresh_from_db()
        self.assertTrue(
            self.user.check_password("OldPassword123!")
        )

    def test_mismatched_passwords_are_rejected(self):

        response = self.client.post(
            self.confirm_url,
            self.reset_payload(
                new_password2="DifferentPassword789!"
            ),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("new_password2", response.data)

        self.user.refresh_from_db()
        self.assertTrue(
            self.user.check_password("OldPassword123!")
        )

    def test_weak_password_is_rejected(self):

        response = self.client.post(
            self.confirm_url,
            self.reset_payload(
                new_password1="password",
                new_password2="password",
            ),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.user.refresh_from_db()
        self.assertTrue(
            self.user.check_password("OldPassword123!")
        )

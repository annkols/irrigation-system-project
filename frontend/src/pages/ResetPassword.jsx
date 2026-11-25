import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function ResetPassword() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const linkIsValid = Boolean(uid && token);

  const submitNewPassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t("passwordReset.passwordMismatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset/confirm/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid,
          token,
          new_password1: newPassword,
          new_password2: confirmPassword,
          language: i18n.language.startsWith("pl") ? "pl" : "en",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.detail || t("passwordReset.resetSuccess"));
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const fieldError =
          data.new_password2?.[0] || data.new_password1?.[0] || data.detail;
        setError(fieldError || t("passwordReset.resetError"));
      }
    } catch (err) {
      console.error(err);
      setError(t("login.serverUnavailable"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="password-reset-page">
      <section className="login-box password-reset-box">
        <h2>{t("passwordReset.newPasswordTitle")}</h2>

        {!linkIsValid ? (
          <p className="form-error" role="alert">
            {t("passwordReset.invalidLink")}
          </p>
        ) : message ? (
          <p className="password-reset-message" role="status">
            {message}
          </p>
        ) : (
          <form onSubmit={submitNewPassword}>
            <div className="login-password-field">
              <input
                className="password-input"
                type={showPassword ? "text" : "password"}
                placeholder={t("passwordReset.newPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? t("common.hide") : t("common.show")}
              </button>
            </div>

            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordReset.confirmPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("passwordReset.saving")
                : t("passwordReset.savePassword")}
            </button>
          </form>
        )}

        <Link className="password-reset-back" to="/">
          {t("passwordReset.backToLogin")}
        </Link>
      </section>
    </main>
  );
}

export default ResetPassword;

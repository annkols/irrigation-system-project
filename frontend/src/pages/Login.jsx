import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function Login({ onClose }) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const navigate = useNavigate(); 

  const login = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.access || data.token);
        if (data.refresh) {
            localStorage.setItem("refresh", data.refresh);
        }
        onClose();
        navigate("/dashboard");
      } else {
        alert(data.detail || t("login.invalidCredentials"));
      }
    } catch (err) {
      console.error(err);
      alert(t("login.serverUnavailable"));
    }
  };

  const requestPasswordReset = async (e) => {
    e.preventDefault();
    setResetMessage("");
    setResetError("");
    setIsSendingReset(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: resetEmail,
          language: i18n.language.startsWith("pl") ? "pl" : "en",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage(data.detail || t("passwordReset.requestSuccess"));
      } else {
        setResetError(
          data.email?.[0] || data.detail || t("passwordReset.requestError")
        );
      }
    } catch (err) {
      console.error(err);
      setResetError(t("login.serverUnavailable"));
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-box">

        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <h2>
          {showPasswordReset ? t("passwordReset.requestTitle") : t("login.title")}
        </h2>

        {showPasswordReset ? (
          <form onSubmit={requestPasswordReset}>
            <p className="password-reset-description">
              {t("passwordReset.requestDescription")}
            </p>

            <input
              type="email"
              placeholder={t("login.email")}
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />

            {resetMessage && (
              <p className="password-reset-message" role="status">
                {resetMessage}
              </p>
            )}
            {resetError && (
              <p className="form-error" role="alert">
                {resetError}
              </p>
            )}

            <button type="submit" disabled={isSendingReset}>
              {isSendingReset
                ? t("passwordReset.sending")
                : t("passwordReset.sendLink")}
            </button>

            <button
              type="button"
              className="password-reset-link"
              onClick={() => {
                setShowPasswordReset(false);
                setResetMessage("");
                setResetError("");
              }}
            >
              {t("passwordReset.backToLogin")}
            </button>
          </form>
        ) : (
          <form onSubmit={login}>

          <input
            type="email"
            placeholder={t("login.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="login-password-field">
            <input
              className="password-input"
              type={showPassword ? "text" : "password"}
              placeholder={t("login.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? t("common.hide") : t("common.show")}
            </button>
          </div>

          <button
            type="button"
            className="password-reset-link"
            onClick={() => {
              setResetEmail(email);
              setShowPasswordReset(true);
            }}
          >
            {t("passwordReset.forgotPassword")}
          </button>

          <button type="submit">
            {t("start.signIn")}
          </button>

        </form>
        )}

      </div>
    </div>
  );
}

export default Login;

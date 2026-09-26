import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function Login({ onClose }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div className="login-overlay">
      <div className="login-box">

        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <h2>{t("login.title")}</h2>

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

          <button type="submit">
            {t("start.signIn")}
          </button>

        </form>

      </div>
    </div>
  );
}

export default Login;

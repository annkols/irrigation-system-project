import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function Login({ onClose }) {
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
        alert(data.detail || "Invalid e-mail or password.");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to connect to the server.");
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-box">

        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <h2>Sign in</h2>

        <form onSubmit={login}>

          <input
            type="email"
            placeholder="University e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="login-password-field">
            <input
              className="password-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit">
            Sign in
          </button>

        </form>

      </div>
    </div>
  );
}

export default Login;
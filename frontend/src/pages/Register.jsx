import React, { useState } from "react";
import "../App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function Register({ onClose }) {
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    role: "",
    university: "",
    department: "",
  });

  const next = () => {
    if (step < 3) setStep(step + 1);
  };

  const back = () => {
    if (step > 1) setStep(step - 1);
  };

  const submit = async () => {
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          username: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          university: form.university,
          department: form.department,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration request sent.");
        onClose();
      } else {
        alert(data.detail || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error.");
    }
  };

  return (
    <div className="register-overlay">
      <div className="register-box">

        <button className="close-btn" onClick={onClose}>
          X
        </button>

        <div className="progress-step">
          <div className={step >= 1 ? "active" : ""}></div>
          <div className={step >= 2 ? "active" : ""}></div>
          <div className={step >= 3 ? "active" : ""}></div>
        </div>

        {step === 1 && (
          <>
            <h2>Make a new account</h2>

            <input
              type="email"
              placeholder="University e-mail"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            <input
              type="password"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({
                  ...form,
                  confirmPassword: e.target.value,
                })
              }
            />

            <button onClick={next}>Next</button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Add more information</h2>

            <input
              placeholder="Name"
              value={form.first_name}
              onChange={(e) =>
                setForm({ ...form, first_name: e.target.value })
              }
            />

            <input
              placeholder="Surname"
              value={form.last_name}
              onChange={(e) =>
                setForm({ ...form, last_name: e.target.value })
              }
            />

            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
            >
              <option value="">Choose role</option>
              <option value="student">Student</option>
              <option value="professor">Professor</option>
              <option value="administrative_worker">Administrative worker</option>
              <option value="other">Other</option>
            </select>

            <div className="buttons">
              <button onClick={back}>Back</button>
              <button onClick={next}>Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Finalize sign-up</h2>

            <input
              placeholder="University"
              value={form.university}
              onChange={(e) =>
                setForm({
                  ...form,
                  university: e.target.value,
                })
              }
            />

            <input
              placeholder="Department"
              value={form.department}
              onChange={(e) =>
                setForm({
                  ...form,
                  department: e.target.value,
                })
              }
            />

            <div className="buttons">
              <button onClick={back}>Back</button>
              <button onClick={submit}>Request access</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;
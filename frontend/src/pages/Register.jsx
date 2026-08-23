import React, { useState } from "react";
import { toast } from "react-toastify";
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

  const [errors, setErrors] = useState({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const validateStep1 = () => {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = "E-mail is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      newErrors.email = "Enter a valid e-mail address.";
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
    } else if (form.password.length < 8) {
      newErrors.password =
        "Password must contain at least 8 characters.";
    } else if (/^\d+$/.test(form.password)) {
      newErrors.password =
        "Password cannot consist entirely of numbers.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (
      form.password !== form.confirmPassword
    ) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!form.first_name.trim()) {
      newErrors.first_name = "Name is required.";
    }

    if (!form.last_name.trim()) {
      newErrors.last_name = "Surname is required.";
    }

    if (!form.role) {
      newErrors.role = "Please choose your role.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    if (step === 1 && !validateStep1()) {
      return;
    }

    if (step === 2 && !validateStep2()) {
      return;
    }

    if (step < 3) {
      setStep(step + 1);
      setErrors({});
    }
  };

  const back = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  };

  const submit = async () => {
    const newErrors = {};

    if (!form.university.trim()) {
      newErrors.university = "University is required.";
    }

    if (!form.department.trim()) {
      newErrors.department = "Department is required.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/register/`,
        {
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
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Registration request sent.");
        onClose();
      } else {
        console.error("Registration errors:", data);

        toast.error(
          data.detail ||
            data.password?.[0] ||
            data.email?.[0] ||
            data.non_field_errors?.[0] ||
            "Registration failed."
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error.");
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
              onChange={(e) => setForm({...form, email: e.target.value,})
              }
            />

            {errors.email && (
              <p className="form-error">
                {errors.email}
              </p>
            )}

            <div className="password-field">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Password"
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {errors.password && (
              <p className="form-error">
                {errors.password}
              </p>
            )}

            <div className="password-field">
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({
                    ...form,
                    confirmPassword: e.target.value, 
                  })
                }
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              >
                {showConfirmPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>

            {errors.confirmPassword && (
              <p className="form-error">
                {errors.confirmPassword}
              </p>
            )}

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
                setForm({...form, first_name: e.target.value, })
              }
            />

            {errors.first_name && (
              <p className="form-error">
                {errors.first_name}
              </p>
            )}

            <input
              placeholder="Surname"
              value={form.last_name}
              onChange={(e) =>
                setForm({...form, last_name: e.target.value, })
              }
            />

            {errors.last_name && (
              <p className="form-error">
                {errors.last_name}
              </p>
            )}

            <select
              value={form.role}
              onChange={(e) =>
                setForm({...form, role: e.target.value, })
              }
            >
              <option value="">Choose role</option>
              <option value="student">Student</option>
              <option value="doctoral_student">Doctoral student</option>
              <option value="academic_employee">Academic employee</option>
              <option value="administrative_worker">Administrative worker</option>
              <option value="other">Other</option>
            </select>

            {errors.role && (
              <p className="form-error">
                {errors.role}
              </p>
            )}

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

            {errors.university && (
              <p className="form-error">
                {errors.university}
              </p>
            )}

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

            {errors.department && (
              <p className="form-error">
                {errors.department}
              </p>
            )}

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

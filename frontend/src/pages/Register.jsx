import React, { useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import "../App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function Register({ onClose }) {
  const { t } = useTranslation();
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
      newErrors.email = t("register.errors.emailRequired");
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      newErrors.email = t("register.errors.emailInvalid");
    }

    if (!form.password) {
      newErrors.password = t("register.errors.passwordRequired");
    } else if (form.password.length < 8) {
      newErrors.password =
        t("register.errors.passwordTooShort");
    } else if (/^\d+$/.test(form.password)) {
      newErrors.password =
        t("register.errors.passwordOnlyNumbers");
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword =
        t("register.errors.confirmPassword");
    } else if (
      form.password !== form.confirmPassword
    ) {
      newErrors.confirmPassword =
        t("register.errors.passwordMismatch");
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!form.first_name.trim()) {
      newErrors.first_name = t("register.errors.firstNameRequired");
    }

    if (!form.last_name.trim()) {
      newErrors.last_name = t("register.errors.lastNameRequired");
    }

    if (!form.role) {
      newErrors.role = t("register.errors.roleRequired");
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
      newErrors.university = t("register.errors.universityRequired");
    }

    if (!form.department.trim()) {
      newErrors.department = t("register.errors.departmentRequired");
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
        toast.success(t("register.requestSent"));
        setTimeout(onClose, 0)
      } else {
        console.error("Registration errors:", data);

        toast.error(
          data.detail ||
            data.password?.[0] ||
            data.email?.[0] ||
            data.non_field_errors?.[0] ||
            t("register.failed")
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(t("register.serverError"));
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
            <h2>{t("register.title")}</h2>

            <input
              type="email"
              placeholder={t("register.email")}
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
                placeholder={t("register.password")}
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
                {showPassword ? t("common.hide") : t("common.show")}
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
                placeholder={t("register.confirmPassword")}
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
                  ? t("common.hide")
                  : t("common.show")}
              </button>
            </div>

            {errors.confirmPassword && (
              <p className="form-error">
                {errors.confirmPassword}
              </p>
            )}

            <button onClick={next}>{t("common.next")}</button>
          </>
        )}

        {step === 2 && (
          <>
            <h2>{t("register.moreInformation")}</h2>

            <input
              placeholder={t("register.firstName")}
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
              placeholder={t("register.lastName")}
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
              <option value="">{t("register.chooseRole")}</option>
              <option value="student">{t("register.roles.student")}</option>
              <option value="doctoral_student">{t("register.roles.doctoralStudent")}</option>
              <option value="academic_employee">{t("register.roles.academicEmployee")}</option>
              <option value="administrative_worker">{t("register.roles.administrativeWorker")}</option>
              <option value="other">{t("register.roles.other")}</option>
            </select>

            {errors.role && (
              <p className="form-error">
                {errors.role}
              </p>
            )}

            <div className="buttons">
              <button onClick={back}>{t("common.back")}</button>
              <button onClick={next}>{t("common.next")}</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>{t("register.finalize")}</h2>

            <input
              placeholder={t("register.university")}
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
              placeholder={t("register.department")}
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
              <button onClick={back}>{t("common.back")}</button>
              <button onClick={submit}>{t("register.requestAccess")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;

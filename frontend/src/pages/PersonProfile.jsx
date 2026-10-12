import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const ROLE_TRANSLATION_KEYS = {
    student: "student",
    doctoral_student: "doctoralStudent",
    academic_employee: "academicEmployee",
    administrative_worker: "administrativeWorker",
    other: "other",
};

export default function PersonProfile() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { id } = useParams();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const roleKey = ROLE_TRANSLATION_KEYS[user?.profile?.role];
    const roleLabel = roleKey ? t(`register.roles.${roleKey}`) : user?.profile?.role;

    useEffect(() => {
        const fetchUserProfile = async () => {
            const accessToken = localStorage.getItem("token");

            if (!accessToken || accessToken === "undefined") {
                setError(t("profile.noToken"));
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE_URL}/users/${id}/`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (response.status === 401) {
                    localStorage.removeItem("token");
                    setError(t("profile.sessionExpired"));
                    setLoading(false);
                    return;
                }

                if (response.status === 404) {
                    setError(t("profile.userNotFound"));
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        t("profile.fetchFailed", { status: response.status })
                    );
                }

                const data = await response.json();
                setUser(data);
            } catch (err) {
                console.error("Error fetching user profile:", err);
                setError(err.message || t("profile.genericError"));
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [id, t]);

    return (
        <div className="dashboard-page">
            <Sidebar />

            <div className="dashboard-content">
                <TopBar />

                <header className="profile-header">
                    <h1>
                        {user
                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                            : t("profile.userProfile")}
                    </h1>

                    <div className="header-actions">
                        <button
                            className="edit-account-btn"
                            onClick={() => navigate("/search-people")}
                        >
                            {t("profile.backToPeople")}
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="loading">
                        {t("profile.loading")}
                    </div>
                ) : error ? (
                    <div className="error-message">
                        <p>{error}</p>

                        <button
                            onClick={() => navigate("/search-people")}
                        >
                            {t("profile.backToPeople")}
                        </button>
                    </div>
                ) : (
                    <div className="profile-container">
                        <div className="my-profile-card">
                            <div className="my-profile-card-inner">

                                <div className="my-profile-details">
                                    <h2>
                                        {t("profile.accountDetails")}
                                    </h2>

                                    <ul className="my-profile-info-list">
                                        <li>
                                            <strong>{t("profile.firstName")}</strong>{" "}
                                            {user?.first_name || "-"}
                                        </li>

                                        <li>
                                            <strong>{t("profile.lastName")}</strong>{" "}
                                            {user?.last_name || "-"}
                                        </li>

                                        <li>
                                            <strong>{t("profile.username")}</strong>{" "}
                                            {user?.username || "-"}
                                        </li>

                                        <li>
                                            <strong>{t("profile.email")}</strong>{" "}
                                            {user?.email || "-"}
                                        </li>

                                        <li>
                                            <strong>{t("profile.university")}</strong>{" "}
                                            {user?.profile?.university || "-"}
                                        </li>

                                        <li>
                                            <strong>{t("profile.department")}</strong>{" "}
                                            {user?.profile?.department || "-"}
                                        </li>

                                        <li>
                                            <strong>{t("profile.role")}</strong>{" "}
                                            {roleLabel || "-"}
                                        </li>
                                    </ul>
                                </div>

                                <div className="my-profile-picture-wrapper">
                                    {user?.profile?.profile_picture ? (
                                        <img
                                            src={user.profile.profile_picture}
                                            alt={t("profile.imageAlt")}
                                            className="my-profile-avatar-img"
                                        />
                                    ) : (
                                        <div className="my-profile-avatar-placeholder">
                                            <span className="material-symbols-outlined">
                                                person
                                            </span>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

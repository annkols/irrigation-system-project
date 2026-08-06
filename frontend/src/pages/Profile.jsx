import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function Profile() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            const accessToken = localStorage.getItem("token");

            if (!accessToken || accessToken === "undefined") {
                setError("No access token found. Please log in.");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/auth/me/`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                });

                if (response.status === 401) {
                    localStorage.removeItem("token");
                    setError("Session expired. Please log in again.");
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch profile (Status: ${response.status})`);
                }

                const data = await response.json();
                setUser(data);
            } catch (err) {
                console.error("Error fetching user profile:", err);
                setError(err.message || "Something went wrong.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    return (
        <div className="dashboard-page">
            <Sidebar />

            <div className="dashboard-content">
                <TopBar />

                <header className="profile-header">
                    <h1>My profile</h1>

                    <div className="header-actions">
                        {/* przycisk edytuj - na przysz³osæ */}
                        <button className="edit-account-btn">
                            Edit profile
                        </button>

                        {/* przycisk usuñ - na przyszloœæ */}
                        <button className="delete-account-btn">
                            Delete profile
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="loading">Loading profile...</div>
                ) : error ? (
                    <div className="error-message">
                        <p>{error}</p>
                        <button onClick={() => navigate("/")}>Go to Login</button>
                    </div>
                ) : (
                    <div className="profile-container" style={{ padding: "1.5rem" }}>
                        
                        <div className="my-profile-card">
                            <div className="my-profile-card-inner">
                                
                                {/* info o u¿ytkowniku */}
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ marginTop: 0 }}>Account Details</h2>
                                    <ul className="my-profile-info-list">
                                        <li><strong>First Name:</strong> {user?.first_name || "-"}</li>
                                        <li><strong>Last Name:</strong> {user?.last_name || "-"}</li>
                                        <li><strong>Email:</strong> {user?.email || "-"}</li>
                                        <li><strong>Active Account:</strong> {user?.is_active ? "Yes" : "No"}</li>
                                        <li><strong>University:</strong> {user?.profile?.university || "-"}</li>
                                        <li><strong>Department:</strong> {user?.profile?.department || "-"}</li>
                                        <li><strong>Role:</strong> {user?.profile?.role || "-"}</li>
                                    </ul>
                                </div>

                                {/* zdjêcie profilowe/placeholder */}
                                <div className="my-profile-picture-wrapper">
                                    {user?.profile?.profile_picture ? (
                                        <img 
                                            src={user.profile.profile_picture} 
                                            alt="Profile" 
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
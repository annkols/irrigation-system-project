import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024;
const PROFILE_PICTURE_UPLOAD_TARGET = 800 * 1024;
const PROFILE_PICTURE_MAX_DIMENSION = 1200;
const ALLOWED_PROFILE_PICTURE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const canvasToBlob = (canvas, quality) => new Promise((resolve, reject) => {
    canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("Could not process the selected image.")),
        "image/jpeg",
        quality
    );
});

const optimizeProfilePicture = async (file) => {
    if (file.size <= PROFILE_PICTURE_UPLOAD_TARGET) return file;

    const bitmap = await createImageBitmap(file);
    const largestDimension = Math.max(bitmap.width, bitmap.height);
    let scale = Math.min(1, PROFILE_PICTURE_MAX_DIMENSION / largestDimension);
    let quality = 0.85;

    try {
        for (let attempt = 0; attempt < 12; attempt += 1) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));

            const context = canvas.getContext("2d");
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

            const blob = await canvasToBlob(canvas, quality);
            if (blob.size <= PROFILE_PICTURE_UPLOAD_TARGET) {
                const baseName = file.name.replace(/\.[^.]+$/, "") || "profile-picture";
                return new File([blob], `${baseName}.jpg`, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                });
            }

            if (quality > 0.55) {
                quality -= 0.1;
            } else {
                scale *= 0.8;
                quality = 0.75;
            }
        }
    } finally {
        bitmap.close();
    }

    throw new Error("The image could not be reduced enough. Please select a smaller file.");
};

export default function Profile() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pictureMessage, setPictureMessage] = useState("");
    const [pictureError, setPictureError] = useState("");
    const [isSavingPicture, setIsSavingPicture] = useState(false);
    const [isRemovingPicture, setIsRemovingPicture] = useState(false);
    const pictureInputRef = useRef(null);

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

    const handleProfilePictureChange = async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;

        setPictureMessage("");
        setPictureError("");

        if (!ALLOWED_PROFILE_PICTURE_TYPES.includes(file.type)) {
            setPictureError("Please select a JPEG, PNG or WEBP image.");
            input.value = "";
            return;
        }

        if (file.size > MAX_PROFILE_PICTURE_SIZE) {
            setPictureError("The profile picture cannot be larger than 5 MB.");
            input.value = "";
            return;
        }

        setIsSavingPicture(true);

        try {
            const optimizedFile = await optimizeProfilePicture(file);
            const formData = new FormData();
            formData.append("profile_picture", optimizedFile);

            const response = await fetch(`${API_BASE_URL}/auth/me/avatar/`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
                body: formData,
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.profile_picture?.[0]
                    || data?.detail
                    || "Failed to update profile picture."
                );
            }

            setUser(data.user);
            window.dispatchEvent(new CustomEvent("current-user-updated", { detail: data.user }));
            setPictureMessage("Profile picture updated successfully.");
        } catch (err) {
            setPictureError(err.message || "Failed to update profile picture.");
        } finally {
            setIsSavingPicture(false);
            input.value = "";
        }
    };

    const handleProfilePictureRemove = async () => {
        setPictureMessage("");
        setPictureError("");
        setIsRemovingPicture(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/me/avatar/`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.detail || "Failed to remove profile picture.");
            }

            setUser(data.user);
            window.dispatchEvent(new CustomEvent("current-user-updated", { detail: data.user }));
            setPictureMessage("Profile picture removed successfully.");
        } catch (err) {
            setPictureError(err.message || "Failed to remove profile picture.");
        } finally {
            setIsRemovingPicture(false);
        }
    };

    return (
        <div className="dashboard-page">
            <Sidebar />

            <div className="dashboard-content">
                <TopBar />

                <header className="profile-header">
                    <h1>My profile</h1>

                    <div className="header-actions">
                        {/* przycisk edytuj - na przyszłosć */}
                        <button className="edit-account-btn">
                            Edit profile
                        </button>

                        {/* przycisk usuń - na przyszlość */}
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
                                
                                {/* info o użytkowniku */}
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

                                {/* zdjęcie profilowe/placeholder */}
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
                                    <input
                                        ref={pictureInputRef}
                                        className="my-profile-picture-input"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleProfilePictureChange}
                                    />
                                    <button
                                        type="button"
                                        className="my-profile-picture-btn"
                                        disabled={isSavingPicture || isRemovingPicture}
                                        onClick={() => pictureInputRef.current?.click()}
                                    >
                                        {isSavingPicture
                                            ? "Saving..."
                                            : user?.profile?.profile_picture
                                                ? "Change picture"
                                                : "Add picture"}
                                    </button>
                                    {user?.profile?.profile_picture && (
                                        <button
                                            type="button"
                                            className="my-profile-picture-remove-btn"
                                            disabled={isSavingPicture || isRemovingPicture}
                                            onClick={handleProfilePictureRemove}
                                        >
                                            {isRemovingPicture ? "Removing..." : "Remove picture"}
                                        </button>
                                    )}
                                    <small className="my-profile-picture-help">
                                        JPEG, PNG or WEBP, up to 5 MB
                                    </small>
                                    {pictureMessage && (
                                        <p className="my-profile-picture-success" role="status">
                                            {pictureMessage}
                                        </p>
                                    )}
                                    {pictureError && (
                                        <p className="my-profile-picture-error" role="alert">
                                            {pictureError}
                                        </p>
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

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function TopBar() {

    const today = new Date();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const toggleMenu = () => {
        setIsMenuOpen((prev) => !prev);
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const accessToken = localStorage.getItem("token");
            
            if (!accessToken || accessToken === "undefined") return;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/me/`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                }
            } catch (err) {
                console.error("Error occured while fetching user's data':", err);
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const logout = async () => {
    setLoading(true);

    const accessToken = localStorage.getItem("token");

        try {
            if (accessToken) {
                await fetch(`${API_BASE_URL}/auth/logout/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`
                    },
                });
            }
        } catch (err) {
            console.error("Błąd podczas wylogowywania:", err);
        } finally {
            localStorage.removeItem("token");
            setLoading(false);
            setIsMenuOpen(false);
            navigate("/");
        }
    };


    return (

        <div className="topbar">

            
            <div className="topbar-actions">

                <button>

                    <span className="material-symbols-outlined">

                        notifications

                    </span>

                </button>

                <button>

                    <span className="material-symbols-outlined">

                        settings

                    </span>

                </button>

                <div className="profile-wrapper" ref={dropdownRef}>
                    <button 
                        type="button" 
                        className="topbar-btn" 
                        onClick={toggleMenu}
                        aria-label="User profile"
                    >
                        <span className="material-symbols-outlined">
                            account_circle
                        </span>
                    </button>

                    {isMenuOpen && (
                        <div className="profile-dropdown">
                            <div className="user-info">
                                <span className="user-fullname">
                                    {user 
                                        ? (user.first_name && user.last_name 
                                            ? `${user.first_name} ${user.last_name}` 
                                            : user.username || user.email)
                                        : "Loading..."}
                                </span>
                                {user?.email && (
                                    <span className="user-email">
                                        {user.email}
                                    </span>
                                )}
                            </div>

                            <button 
                                type="button" 
                                className="my-account-btn"
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    navigate("/account"); // zmienić ścieżkę jak już dodam
                                }}
                            >
                                My account
                            </button>

                            <button 
                                type="button"
                                className="logout-btn" 
                                onClick={logout} 
                                disabled={loading}
                            >
                                {loading ? "Logging out..." : "Log out"}
                            </button>
                        </div>
                    )}
                </div>

            </div>

        </div>

    );

}
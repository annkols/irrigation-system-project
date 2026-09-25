import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function TopBar({ experimentName }) {

    const today = new Date();

    const location = useLocation();
    const isExperimentDetails = location.pathname.startsWith('/experiment/');

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);

    const dropdownRef = useRef(null);
    const notificationsRef = useRef(null);
    const settingsRef = useRef(null);

    const navigate = useNavigate();

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);
    const toggleNotifications = () => setIsNotificationsOpen((prev) => !prev);
    const toggleSettings = () => setIsSettingsOpen((prev) => !prev);

    const generateBreadcrumbs = () => {
        const paths = location.pathname.split("/").filter(Boolean);
        
        let accumulatedPath = "";
        
        return paths.map((segment, index) => {
            accumulatedPath += `/${segment}`;
            const isLast = index === paths.length - 1;
            
            let formattedName = segment;

            if (index === 0 && segment.toLowerCase() === 'dashboard') {
                return null;
            }

            const isExperimentId = paths[index - 1] === 'experiment';

            if (isExperimentId && experimentName) {
                formattedName = experimentName;
            } else if (segment.toLowerCase() === 'experiment') {
                return null;
            } else {
                formattedName = segment
                    .replace(/-/g, " ")
                    .replace(/^./, (str) => str.toUpperCase());
            }

            return {
                name: formattedName,
                path: accumulatedPath,
                isLast,
            };
        }).filter(Boolean);
    };

    const breadcrumbs = generateBreadcrumbs();

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

        const handleCurrentUserUpdated = (event) => setUser(event.detail);
        window.addEventListener("current-user-updated", handleCurrentUserUpdated);

        return () => {
            window.removeEventListener("current-user-updated", handleCurrentUserUpdated);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
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

            {/* sciezka(breadcrumbs) po lewej */}
            <div className="topbar-breadcrumb">
                <span 
                    className="topbar-breadcrumb-link" 
                    onClick={() => navigate('/dashboard')}
                >
                    Dashboard
                </span>
            
                {breadcrumbs.map((crumb) => (
                    <React.Fragment key={crumb.path}>
                        <span className="topbar-breadcrumb-sep">›</span>
                        {crumb.isLast ? (
                            <span className="topbar-breadcrumb-current">{crumb.name}</span>
                        ) : (
                            <span 
                                className="topbar-breadcrumb-link" 
                                onClick={() => navigate(crumb.path)}
                            >
                                {crumb.name}
                            </span>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* przyciski po prawej */}
            <div className="topbar-actions">

                {/* powiadomienia */}
                <div className="notifications-wrapper" ref={notificationsRef}>
                    <button 
                        type="button" 
                        className="topbar-btn" 
                        onClick={toggleNotifications}
                        aria-label="Notifications"
                    >
                        <span className="material-symbols-outlined">
                            notifications
                        </span>
                    </button>
                    {isNotificationsOpen && (
                        <div className="notifications-dropdown">
                            <span className="notifications-empty">No unread notifications</span>
                        </div>
                    )}
                </div>

                {/* ustawienia */}
                <div className="settings-wrapper" ref={settingsRef}>
                    <button 
                        type="button" 
                        className="topbar-btn" 
                        onClick={toggleSettings}
                        aria-label="Settings"
                    >
                        <span className="material-symbols-outlined">
                            settings
                        </span>
                    </button>
                    {isSettingsOpen && (
                        <div className="settings-dropdown">
                            {/* jezyk */}
                            <div className="settings-item center-item">
                                <div className="settings-options">
                                    <button type="button" className="lang-btn" title="English">
                                        <img src="https://flagcdn.com/w40/gb.png" alt="UK flag" className="flag-icon" />
                                    </button>
                                    <button type="button" className="lang-btn" title="Polski">
                                        <img src="https://flagcdn.com/w40/pl.png" alt="Poland flag" className="flag-icon" />
                                    </button>
                                </div>
                            </div>
                            {/* motyw */}
                            <div className="settings-item center-item">
                                <div className="settings-options">
                                    <button type="button" className="theme-toggle-btn" title="Light mode">
                                        <span className="material-symbols-outlined">
                                            light_mode
                                        </span>
                                    </button>
                                    <button type="button" className="theme-toggle-btn" title="Dark mode">
                                        <span className="material-symbols-outlined">
                                            dark_mode
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* profil */}
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

                                <div className="dropdown-avatar-wrapper">
                                    {user?.profile?.profile_picture ? (
                                        <img 
                                            src={user.profile.profile_picture} 
                                            alt="Profile" 
                                            className="dropdown-avatar-img"
                                        />
                                    ) : (
                                        <div className="dropdown-avatar-placeholder">
                                            <span className="material-symbols-outlined">
                                                person
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
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
                                    navigate("/profile");
                                }}
                            >
                                My profile
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

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function PeopleSearch() {
    const navigate = useNavigate();

    const [search, setSearch] = useState("");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        const query = search.trim();

        // minimum 2 znaki
        if (query.length < 2) {
            setUsers([]);
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");

            const headers = token
                ? {
                      Authorization: `Bearer ${token}`,
                  }
                : {};

            const queryParams = new URLSearchParams();
            queryParams.append("q", query);

            const response = await fetch(
                `${API_BASE_URL}/users/search/?${queryParams.toString()}`,
                {
                    method: "GET",
                    headers: headers,
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("token");

                navigate("/", {
                    state: {
                        showLogin: true,
                    },
                });

                return;
            }

            if (!response.ok) {
                throw new Error("Could not fetch users.");
            }

            const data = await response.json();

            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error loading users:", error);

            toast.error("Error loading users.");

            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [search, navigate]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [fetchUsers]);

    const openPersonProfile = (userId) => {
        navigate(`/person/${userId}`);
    };

    return (
        <div className="dashboard-page">
            <Sidebar />

            <div className="dashboard-content">
                <TopBar />

                <main className="people-search-page">

                    <header className="people-search-header">
                        <h1>People Search</h1>
                    </header>

                    <section className="people-search-filters">

                        <div className="people-search-field">
                            <label htmlFor="people-search">
                                Search users
                            </label>

                            <div className="search-input-wrapper">

                                <span className="material-symbols-outlined search-icon">
                                    search
                                </span>

                                <input
                                    id="people-search"
                                    type="text"
                                    placeholder="Name, username, university..."
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(e.target.value)
                                    }
                                />

                            </div>
                        </div>

                    </section>

                    <section className="people-results">

                        {loading ? (
                            <div className="loading">
                                Loading...
                            </div>
                        ) : users.length > 0 ? (

                            <div className="people-results-list">

                                {users.map((user) => (

                                    <div
                                        key={user.id}
                                        className="person-card"
                                        onClick={() =>
                                            openPersonProfile(user.id)
                                        }
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" ||
                                                e.key === " "
                                            ) {
                                                openPersonProfile(user.id);
                                            }
                                        }}
                                    >

                                        <div className="person-avatar">

                                            {user.profile?.profile_picture ? (
                                                <img
                                                    src={
                                                        user.profile
                                                            .profile_picture
                                                    }
                                                    alt="Profile"
                                                />
                                            ) : (
                                                <span className="material-symbols-outlined">
                                                    person
                                                </span>
                                            )}

                                        </div>

                                        <div className="person-info">

                                            <h3>
                                                {user.first_name ||
                                                user.last_name
                                                    ? `${user.first_name || ""} ${
                                                          user.last_name || ""
                                                      }`.trim()
                                                    : user.username}
                                            </h3>

                                            {user.username && (
                                                <p className="person-username">
                                                    @{user.username}
                                                </p>
                                            )}

                                            {user.profile?.university && (
                                                <p className="person-university">
                                                    {user.profile.university}
                                                </p>
                                            )}

                                            {user.profile?.department && (
                                                <p className="person-department">
                                                    {user.profile.department}
                                                </p>
                                            )}

                                        </div>

                                    </div>

                                ))}

                            </div>

                        ) : search.trim().length >= 2 ? (

                            <p>
                                No users found.
                            </p>

                        ) : (

                            <p>
                                Start typing to search for people.
                            </p>

                        )}

                    </section>

                </main>
            </div>
        </div>
    );
}
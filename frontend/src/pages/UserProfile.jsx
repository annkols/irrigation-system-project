import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function UserProfile() {
    const { id } = useParams();

    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem("token");

                const response = await fetch(
                    `${API_BASE_URL}/users/${id}/`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const data = await response.json();

                setUser(data);
            } catch (error) {
                console.error(error);
            }
        };

        fetchUser();
    }, [id]);

    if (!user) {
        return <p>Loading...</p>;
    }

    return (
        <div className="user-profile-page">
            <h1>
                {user.first_name} {user.last_name}
            </h1>

            <p>Email: {user.email}</p>

            {user.username && (
                <p>Username: {user.username}</p>
            )}
        </div>
    );
}
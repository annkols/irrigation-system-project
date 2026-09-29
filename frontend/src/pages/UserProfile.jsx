import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function UserProfile() {
    const { id } = useParams();
    const { t } = useTranslation();

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
        return <p>{t("common.loading")}</p>;
    }

    return (
        <div className="user-profile-page">
            <h1>
                {user.first_name} {user.last_name}
            </h1>

            <p>{t("profile.email")} {user.email}</p>

            {user.username && (
                <p>{t("profile.username")} {user.username}</p>
            )}
        </div>
    );
}

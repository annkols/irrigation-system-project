import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import logo from "./images/logo-color.png";
import name from "./images/name-color.png";

export default function Sidebar() {

    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(
        () => localStorage.getItem("sidebar-collapsed") === "true"
    );

    const toggleCollapsed = () => {
        setCollapsed((current) => {
            const next = !current;
            localStorage.setItem("sidebar-collapsed", String(next));
            return next;
        });
    };

    const menu = [
        {
            icon: "dashboard",
            title: t("navigation.dashboard"),
            path: "/dashboard"
        },
        {
            icon: "search",
            title: t("navigation.searchExperiments"),
            path: "/search-experiments"
        },
        {
            icon: "person",
            title: t("navigation.searchPeople"),
            path: "/search-people"
        },
        {
            icon: "description",
            title: t("navigation.reports"),
            path: "/reports"
        },
    ];

    return (

        <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>

            <button
                type="button"
                className="sidebar-collapse-button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? t("navigation.expandSidebar") : t("navigation.collapseSidebar")}
                title={collapsed ? t("navigation.expandSidebar") : t("navigation.collapseSidebar")}
            >
                <span className="material-symbols-outlined">
                    {collapsed ? "chevron_right" : "chevron_left"}
                </span>
            </button>

            <div
                className="sidebar-logo"
                onClick={() => navigate("/dashboard")}
                data-sidebar-tooltip={t("navigation.dashboard")}
                tabIndex={0}
                role="button"
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") navigate("/dashboard");
                }}
            >

                <img
                    src={logo}
                    alt="Logo"
                    className="sidebar-logo-mark"
                />

                <img
                    src={name}
                    alt="PlantStalker"
                    className="sidebar-name"
                />

            </div>

            <nav>

                {menu.map(item => (

                    <button

                        key={item.title}

                        className={
                            location.pathname === item.path
                                ? "menu-item active"
                                : "menu-item"
                        }

                        onClick={() => navigate(item.path)}
                        data-sidebar-tooltip={item.title}
                        aria-label={item.title}
                        title={item.title}

                    >

                        <span className="material-symbols-outlined">

                            {item.icon}

                        </span>

                        <span className="menu-item-label">

                            {item.title}

                        </span>

                    </button>

                ))}

            </nav>

        </aside>

    );

}

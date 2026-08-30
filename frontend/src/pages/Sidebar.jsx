import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import logo from "./images/logo-color.png";
import name from "./images/name-color.png";

export default function Sidebar() {

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
            title: "Dashboard",
            path: "/dashboard"
        },
        {
            icon: "search",
            title: "Search Experiments",
            path: "/search-experiments"
        },
        {
            icon: "person",
            title: "Search People",
            path: "/search-people"
        },
        {
            icon: "description",
            title: "Reports",
            path: "/reports"
        },
    ];

    return (

        <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>

            <button
                type="button"
                className="sidebar-collapse-button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <span className="material-symbols-outlined">
                    {collapsed ? "chevron_right" : "chevron_left"}
                </span>
            </button>

            <div
                className="sidebar-logo"
                onClick={() => navigate("/dashboard")}
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

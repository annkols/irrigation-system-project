import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

import logo from "./images/logo_cultiva.svg";

export default function Sidebar() {

    const navigate = useNavigate();
    const location = useLocation();

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

        <aside className="sidebar">

            <div
                className="sidebar-logo"
                onClick={() => navigate("/dashboard")}
            >

                <img
                    src={logo}
                    alt="PlantStalker"
                />

                <h2>PlantStalker</h2>

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

                        <span>

                            {item.title}

                        </span>

                    </button>

                ))}

            </nav>

        </aside>

    );

}
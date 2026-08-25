import React, { useState } from "react";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

export default function PeopleSearch() {
    const [search, setSearch] = useState("");
    const [university, setUniversity] = useState("");

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
                                Search by Name or Email
                            </label>

                            <div className="search-input-wrapper">
                                <span className="material-symbols-outlined search-icon">
                                    search
                                </span>

                                <input
                                    id="people-search"
                                    type="text"
                                    placeholder="Name"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="people-search-field">
                            <label htmlFor="university">
                                University
                            </label>

                            <input
                                id="university"
                                type="text"
                                placeholder="University"
                                value={university}
                                onChange={(e) => setUniversity(e.target.value)}
                            />
                        </div>

                    </section>

                    {/*  */}
                    <section className="people-results">
                    </section>

                    <div className="people-navigation">
                        <button className="navigation-button">
                            &lsaquo;
                        </button>

                        <span>
                            Page 1 of 1
                        </span>

                        <button className="navigation-button">
                            &rsaquo;
                        </button>
                    </div>

                </main>
            </div>
        </div>
    );
}
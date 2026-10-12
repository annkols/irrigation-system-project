import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";
import ExperimentCard from "./ExperimentCard";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function ExperimentSearch() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [search, setSearch] = useState("");
    const [keywords, setKeywords] = useState("");
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchExperiments = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const queryParams = new URLSearchParams();
            if (search.trim()) queryParams.append("search", search.trim());
            if (keywords.trim()) queryParams.append("keywords", keywords.trim());

            const res = await fetch(
                `${API_BASE_URL}/experiments/search/?${queryParams.toString()}`,
                { headers }
            );

            if (res.status === 401) {
                localStorage.removeItem("token");
                navigate("/", { state: { showLogin: true } });
                return;
            }

            if (!res.ok) {
                throw new Error(t("experimentSearch.loadError"));
            }

            const data = await res.json();
            setExperiments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            toast.error(t("experimentSearch.loadError"));
        } finally {
            setLoading(false);
        }
    }, [search, keywords, navigate, t]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchExperiments();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [fetchExperiments]);

    return (
        <div className="dashboard-page">
            <Sidebar />

            <div className="dashboard-content">
                <TopBar />

                <main className="people-search-page">

                    <header className="people-search-header">
                        <h1>{t("experimentSearch.title")}</h1>
                    </header>

                    <section className="people-search-filters">

                        <div className="people-search-field">
                            <label htmlFor="experiment-search">
                                {t("experimentSearch.searchLabel")}
                            </label>

                            <div className="search-input-wrapper">
                                <span className="material-symbols-outlined search-icon">
                                    search
                                </span>

                                <input
                                    id="experiment-search"
                                    type="text"
                                    placeholder={t("experimentSearch.searchPlaceholder")}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="people-search-field">
                            <label htmlFor="keywords">
                                {t("experimentSearch.keywordsLabel")}
                            </label>

                            <input
                                id="keywords"
                                type="text"
                                placeholder={t("experimentSearch.keywordsPlaceholder")}
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                            />
                        </div>

                    </section>

                    <section className="people-results">
                        {loading ? (
                            <div className="loading">{t("common.loading")}</div>
                        ) : experiments.length > 0 ? (
                            <div className="dashboard-grid">
                                {experiments.map((experiment) => (
                                    <ExperimentCard
                                        key={experiment.id}
                                        experiment={experiment}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p>{t("experimentSearch.notFound")}</p>
                        )}
                    </section>

                    <div className="people-navigation">
                        <button className="navigation-button">
                            &lsaquo;
                        </button>

                        <span>
                            {t("experimentSearch.pageOf")}
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

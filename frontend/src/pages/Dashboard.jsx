import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";
import ExperimentCard from "./ExperimentCard";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function Dashboard() {
    const navigate = useNavigate();

    const [experiments, setExperiments] = useState([]);
    const [measurements, setMeasurements] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = token
                ? { Authorization: `Bearer ${token}` }
                : {};

            const [expRes, measRes] = await Promise.all([
                fetch(`${API_BASE_URL}/experiments/`, { headers }),
                fetch(`${API_BASE_URL}/measurements/`, { headers })
            ]);

            if (expRes.status === 401) {
                localStorage.removeItem("token");
                navigate("/login");
                return;
            }

            if (!expRes.ok || !measRes.ok) {
                throw new Error("Could not load dashboard data.");
            }

            const expData = await expRes.json();
            const measData = await measRes.json();

            setExperiments(Array.isArray(expData) ? expData : []);
            setMeasurements(Array.isArray(measData) ? measData : []);
        } catch (err) {
            console.error(err);
            toast.error("Could not load dashboard data.");
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const cards = useMemo(() => {
        return experiments.map((experiment) => {
            const experimentMeasurements = measurements.filter(
                m => m.station_number === experiment.sensor_set_id
            );

            return { experiment, measurements: experimentMeasurements };
        });
    }, [experiments, measurements]);

    const activeCards = cards.filter(
        ({ experiment }) => experiment.status !== "completed"
    );

    const completedCards = cards.filter(
        ({ experiment }) => experiment.status === "completed"
    );

    return (
        <div className="dashboard-page">
            <Sidebar />

            <div className="dashboard-content">
                <TopBar />

                <header className="dashboard-header">
                    <h1>Experiments</h1>

                    <button
                        className="new-experiment-btn"
                        onClick={() => navigate("/new-experiment")}
                    >
                        + Add New Experiment
                    </button>
                </header>

                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <>
                        <ExperimentSection
                            title="Active Experiments"
                            cards={activeCards}
                        />

                        {completedCards.length > 0 && (
                            <CompletedExperimentsTable
                                title="Completed Experiments"
                                cards={completedCards}
                                navigate={navigate}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function ExperimentSection({ title, cards }) {
    return (
        <>
            <h2 className="section-title">{title}</h2>

            <div className="dashboard-grid">
                {cards.map(({ experiment, measurements }) => (
                    <ExperimentCard
                        key={experiment.id}
                        experiment={experiment}
                        measurements={measurements}
                    />
                ))}
            </div>
        </>
    );
}

function CompletedExperimentsTable({ title, cards, navigate }) {
    return (
        <>
            <h2 className="section-title completed-title">{title}</h2>

            <div className="completed-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Started</th>
                            <th>Finished</th>
                            <th>Sensor set</th>
                        </tr>
                    </thead>

                    <tbody>
                        {cards.map(({ experiment }) => (
                            <tr
                                key={experiment.id}
                                onClick={() => navigate(`/experiment/${experiment.id}`)}
                            >
                                <td>{experiment.name}</td>

                                <td>
                                    {experiment.started_at
                                        ? new Date(experiment.started_at).toLocaleDateString()
                                        : "-"}
                                </td>

                                <td>
                                    {experiment.finished_at
                                        ? new Date(experiment.finished_at).toLocaleDateString()
                                        : "-"}
                                </td>
                                <td>{experiment.sensor_set_id ?? "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

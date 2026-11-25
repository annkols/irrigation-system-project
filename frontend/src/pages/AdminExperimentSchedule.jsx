import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const ownerLabel = (owner) => {
  if (!owner) return "-";
  const fullName = `${owner.first_name || ""} ${owner.last_name || ""}`.trim();
  return fullName ? `${fullName} (${owner.email})` : owner.email;
};

export default function AdminExperimentSchedule() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const loadExperiments = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_BASE_URL}/experiments/admin/schedule/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        navigate("/", { state: { showLogin: true } });
        return;
      }
      if (response.status === 403) {
        setError(t("adminSchedule.forbidden"));
        return;
      }
      if (!response.ok) throw new Error(String(response.status));

      const data = await response.json();
      setExperiments(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error(requestError);
      setError(t("adminSchedule.loadError"));
    } finally {
      setLoading(false);
    }
  }, [navigate, t]);

  useEffect(() => {
    loadExperiments();
  }, [loadExperiments]);

  const calendarDays = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, monthIndex, 1 - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [month]);

  const experimentsForDay = (day) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();

    return experiments.filter((experiment) => {
      if (!experiment.started_at || !(experiment.finished_at || experiment.planned_end_at)) {
        return false;
      }
      const start = new Date(experiment.started_at).getTime();
      const end = new Date(experiment.finished_at || experiment.planned_end_at).getTime();
      return start <= dayEnd && end >= dayStart;
    });
  };

  const formatDateTime = (value) => value
    ? new Date(value).toLocaleString(i18n.resolvedLanguage, { hourCycle: "h23" })
    : "-";

  return (
    <div className="dashboard-page">
      <Sidebar />
      <div className="dashboard-content admin-schedule-page">
        <TopBar />
        <header className="dashboard-header admin-schedule-header">
          <div>
            <h1>{t("adminSchedule.title")}</h1>
            <p>{t("adminSchedule.description")}</p>
          </div>
          <button type="button" className="admin-schedule-refresh" onClick={loadExperiments}>
            <span className="material-symbols-outlined">refresh</span>
            {t("adminSchedule.refresh")}
          </button>
        </header>

        {loading ? (
          <div className="loading">{t("common.loading")}</div>
        ) : error ? (
          <div className="admin-schedule-error" role="alert">{error}</div>
        ) : (
          <>
            <section className="admin-calendar-card">
              <div className="admin-calendar-toolbar">
                <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label={t("adminSchedule.previousMonth")}>‹</button>
                <h2>{month.toLocaleDateString(i18n.resolvedLanguage, { month: "long", year: "numeric" })}</h2>
                <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label={t("adminSchedule.nextMonth")}>›</button>
              </div>

              <div className="admin-calendar-weekdays">
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                  <span key={day}>{t(`adminSchedule.weekdays.${day}`)}</span>
                ))}
              </div>

              <div className="admin-calendar-grid">
                {calendarDays.map((day) => {
                  const dayExperiments = experimentsForDay(day);
                  const outsideMonth = day.getMonth() !== month.getMonth();
                  return (
                    <div key={day.toISOString()} className={`admin-calendar-day${outsideMonth ? " admin-calendar-day--outside" : ""}`}>
                      <span className="admin-calendar-day-number">{day.getDate()}</span>
                      <div className="admin-calendar-events">
                        {dayExperiments.map((experiment) => (
                          <button
                            type="button"
                            key={experiment.id}
                            className={`admin-calendar-event${experiment.finished_at ? " admin-calendar-event--finished" : ""}`}
                            title={`${experiment.name} · ${ownerLabel(experiment.owner)}`}
                            onClick={() => navigate(`/experiment/${experiment.id}`)}
                          >
                            <strong>Z{experiment.sensor_set_id}</strong> {experiment.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="admin-schedule-table-card">
              <h2>{t("adminSchedule.listTitle")}</h2>
              <div className="admin-schedule-table-wrap">
                <table className="admin-schedule-table">
                  <thead>
                    <tr>
                      <th>{t("adminSchedule.experiment")}</th>
                      <th>{t("adminSchedule.owner")}</th>
                      <th>{t("adminSchedule.sensorSet")}</th>
                      <th>{t("adminSchedule.start")}</th>
                      <th>{t("adminSchedule.plannedEnd")}</th>
                      <th>{t("adminSchedule.actualEnd")}</th>
                      <th>{t("adminSchedule.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {experiments.map((experiment) => (
                      <tr key={experiment.id} onClick={() => navigate(`/experiment/${experiment.id}`)}>
                        <td>{experiment.name}</td>
                        <td>{ownerLabel(experiment.owner)}</td>
                        <td>{experiment.sensor_set_id}</td>
                        <td>{formatDateTime(experiment.started_at)}</td>
                        <td>{formatDateTime(experiment.planned_end_at)}</td>
                        <td>{formatDateTime(experiment.finished_at)}</td>
                        <td>{t(`adminSchedule.statuses.${experiment.status.replaceAll(" ", "_")}`)}</td>
                      </tr>
                    ))}
                    {experiments.length === 0 && (
                      <tr><td colSpan="7" className="admin-schedule-empty">{t("adminSchedule.empty")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import "../App.css";
import logo from "./images/logo_cultiva.svg";
import bgImage from "./images/back.jpg";
import ExperimentChart from "./ExperimentChart";

const API_BASE_URL = "http://localhost:8000/api";
const pumpCommands = ["ON", "OFF", "AUTO"];

function Experiment_details() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [experiment, setExperiment] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [selectedPumpCommand, setSelectedPumpCommand] = useState(null);
  const [pumpCommandStatus, setPumpCommandStatus] = useState("");
  const [isSendingPumpCommand, setIsSendingPumpCommand] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const now = new Date();
  const nowDate = now.toLocaleDateString("pl-PL");
  const nowTime = now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    fetch(`${API_BASE_URL}/experiments/${id}/`)
      .then(res => res.json())
      .then(data => setExperiment(data))
      .catch(err => console.error(err));

    const fetchMeasurements = () => {
      fetch(`${API_BASE_URL}/measurements/`)
        .then(res => res.json())
        .then(data => setMeasurements(data))
        .catch(err => console.error(err));
    };

    fetchMeasurements();
    const interval = setInterval(fetchMeasurements, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const latest = measurements.length > 0 ? measurements[0] : null;

  const statusMap = {
    "in-progress": "IN PROGRESS",
    "not started": "NOT STARTED",
    "completed": "COMPLETED",
    "soon": "SOON ENDING",
  };

  const calculateProgress = (exp) => {
    if (!exp || !exp.started_at) return 0;
    if (!exp.finished_at) return 0;
    const start = new Date(exp.started_at).getTime();
    const end = new Date(exp.finished_at).getTime();
    const nowTs = new Date().getTime();
    if (nowTs >= end) return 100;
    if (nowTs <= start) return 0;
    return Math.round(((nowTs - start) / (end - start)) * 100);
  };

  const sendPumpCommand = async (command) => {
    setIsSendingPumpCommand(true);
    setPumpCommandStatus("");
    try {
      const response = await fetch(`${API_BASE_URL}/pump-control/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (!response.ok) throw new Error("Pump command failed");
      setSelectedPumpCommand(command);
      setPumpCommandStatus(`Command ${command} sent`);
    } catch (error) {
      setPumpCommandStatus("Command failed");
    } finally {
      setIsSendingPumpCommand(false);
    }
  };

  if (!experiment) return <div style={{ padding: 40 }}>Loading...</div>;

  const progressPercent = calculateProgress(experiment);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("pl-PL");
  };

  return (
    <>
      <header className="header">
        <div className="logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <img src={logo} alt="Cultiva logo" className="logo-img" />
          <h1>CULTIVA</h1>
        </div>
        <div className="icons">
          <span className="material-symbols-outlined">settings</span>
          <span className="material-symbols-outlined">account_circle</span>
          <span className="material-symbols-outlined">more_vert</span>
        </div>
      </header>

      <div className="exp-details-page">

        {/* tytuł strony z powrotem */}
        <div className="exp-details-title-row">
          <button className="exp-back-btn" onClick={() => navigate('/dashboard')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="exp-details-title">Experiment details</h2>
        </div>

        {/* nazwa + akcje */}
        <div className="exp-details-name-row">
          <h1 className="exp-details-name">{experiment.name}</h1>
          <div className="exp-details-actions">
            <span className="material-symbols-outlined">edit</span>
            <span className="material-symbols-outlined">settings</span>
            <span className="material-symbols-outlined">delete</span>
          </div>
        </div>

        {/* pasek statusu */}
        <div className="exp-details-status-row">
          <span className="exp-details-status-label">Status</span>
          <div className="exp-details-progress-bar">
            <div className="exp-details-progress" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* prywatny */}
        <p className="exp-details-private">This experiment is private</p>

        {/* plant type */}
        <div className="exp-details-field">
          <span className="exp-details-field-label">Plant type:</span>
          <span>{experiment.plant_name || "-"}</span>
        </div>

        {/* opis */}
        <div className="exp-details-field">
          <span className="exp-details-field-label">Opis:</span>
          <p className="exp-details-description">{experiment.description || "-"}</p>
        </div>

        {/* tagi */}
        {experiment.tags?.length > 0 && (
          <div className="exp-details-field">
            <span className="exp-details-field-label">Tags:</span>
            <div className="exp-details-tags">
              {experiment.tags.map((tag, i) => (
                <span key={i} className="exp-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* daty */}
        <div className="exp-details-dates">
          <div className="exp-details-date-field">
            <label>Start date:</label>
            <input type="date" defaultValue={experiment.started_at?.slice(0, 10)} />
          </div>
          <div className="exp-details-date-field">
            <label>Planned end date:</label>
            <input type="date" defaultValue={experiment.finished_at?.slice(0, 10)} />
          </div>
        </div>

        {/* współpracownicy */}
        <div className="exp-details-field">
          <span className="exp-details-field-label">Collaborators:</span>
          <div className="exp-collaborators">
            {experiment.collaborators?.map((c, i) => (
              <span key={i} className="collab-chip">{c}</span>
            ))}
          </div>
        </div>

        {/* zdjęcie + odczyty */}
        <div className="exp-details-readings-row">
          <div className="exp-details-img-box">
            <img src={bgImage} alt="experiment" className="exp-details-img" />

            {/* pump control */}
            <div className="pump-control">
              <div className="pump-control-header">
                <span>Pump control</span>
                <span className="pump-control-state">
                  {latest ? (latest.pump_on ? "RUNNING" : "STOPPED") : "NO DATA"}
                </span>
              </div>
              <div className="pump-command-buttons">
                {pumpCommands.map((command) => (
                  <button
                    key={command}
                    type="button"
                    className={`pump-command-btn ${selectedPumpCommand === command ? "active" : ""}`}
                    disabled={isSendingPumpCommand}
                    onClick={() => sendPumpCommand(command)}
                  >
                    {command}
                  </button>
                ))}
              </div>
              {pumpCommandStatus && (
                <p className={pumpCommandStatus.includes("failed") ? "pump-command-error" : "pump-command-status"}>
                  {pumpCommandStatus}
                </p>
              )}
            </div>
          </div>

          <div className="exp-details-readings">
            <div className="readings-header">
              <span className="readings-title">Last reading:</span>
              <span>{nowDate} {nowTime}</span>
            </div>
            <div className="stats">
              <div className="row"><span>Temperature inside</span><span>{latest?.air_temperature ?? "-"} °C</span></div>
              <div className="row"><span>Soil moisture</span><span>{latest?.moisture_percent ?? "-"} %</span></div>
              <div className="row"><span>Air humidity</span><span>{latest?.air_humidity ?? "-"} %</span></div>
              <div className="row"><span>Light intensity</span><span>{latest?.light_lux ?? "-"} lx</span></div>
              <div className="row"><span>Soil temperature</span><span>{latest?.soil_temperature ?? "-"} °C</span></div>
              <div className="row"><span>Pressure</span><span>{latest?.pressure_hpa ?? "-"} hPa</span></div>
              <div className="row"><span>Pump</span><span>{latest ? (latest.pump_on ? "ON" : "OFF") : "-"}</span></div>
            </div>
          </div>
        </div>

        {/* akcje eksportu i historii */}
        <button className='action'>
          <span>FULL EXPERIMENT HISTORY</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>

        <div className="export-dropdown">
          <button className="export-btn" onClick={() => setExportOpen(!exportOpen)}>
            <span className="material-symbols-outlined">download</span>
            <span>EXPORT RAW MEASUREMENTS</span>
            <span className="material-symbols-outlined">expand_more</span>
          </button>
          {exportOpen && (
            <div className="export-menu">
              <button onClick={() => { window.open(`${API_BASE_URL}/experiments/${id}/export-csv/?export_format=csv`, '_blank'); setExportOpen(false); }}>CSV</button>
              <button onClick={() => { window.open(`${API_BASE_URL}/experiments/${id}/export-csv/?export_format=json`, '_blank'); setExportOpen(false); }}>JSON</button>
            </div>
          )}
        </div>

        {/* wykresy */}
        <ExperimentChart />


      </div>
    </>
  );
}

export default Experiment_details;

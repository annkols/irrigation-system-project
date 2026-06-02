import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../App.css";
import bgImage from "./images/back.jpg";
import logo from "./images/logo_cultiva.svg";
import ExperimentChart from "./ExperimentChart";

const API_BASE_URL = "http://localhost:8000/api";
const pumpCommands = ["ON", "OFF", "AUTO"];
const sensorRows = {
  air_temperature: { label: "Temperature inside", unit: "°C", field: "air_temperature" },
  soil_moisture: { label: "Soil moisture", unit: "%", field: "moisture_percent" },
  air_humidity: { label: "Air humidity", unit: "%", field: "air_humidity" },
  light: { label: "Light intensity", unit: "lx", field: "light_lux" },
  soil_temperature: { label: "Soil temperature", unit: "°C", field: "soil_temperature" },
  pressure: { label: "Pressure", unit: "hPa", field: "pressure_hpa" },
};
const sensorSetKeys = {
  1: ["soil_moisture", "air_temperature", "air_humidity"],
  2: ["soil_moisture", "air_temperature", "air_humidity", "light"],
  3: ["air_humidity", "light", "soil_moisture", "pressure", "soil_temperature", "air_temperature"],
};

function App() {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [measurements, setMeasurements] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPumpCommand, setSelectedPumpCommand] = useState(null);
  const [pumpCommandStatus, setPumpCommandStatus] = useState("");
  const [isSendingPumpCommand, setIsSendingPumpCommand] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const now = new Date();
  const nowDate = now.toLocaleDateString("pl-PL");
  const nowTime = now.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const statusMap = {
    all: "ALL",
    "in-progress": "IN PROGRESS",
    "not started": "NOT STARTED",
    "completed": "COMPLETED",
    "soon": "SOON ENDING",
  };

  const filtered = experiments.filter((exp) =>
    filter === "all" ? true : exp.status === filter
  );

  useEffect(() => {
    const fetchData = () => {
      fetch(`${API_BASE_URL}/measurements/`)
        .then(res => res.json())
        .then(data => setMeasurements(data))
        .catch(err => console.error(err));

        fetch(`${API_BASE_URL}/experiments/`)
      .then(res => res.json())
      .then(data => {
        setExperiments(data);
        if (data.length > 0 && selectedId === null) {
          setSelectedId(data[0].id);
        }
      })
      .catch(err => console.error(err));
    };

    fetchData();

    const interval = setInterval(fetchData, 10000);

    return () => clearInterval(interval);
  }, [selectedId]);

  const mainexp = experiments.find(exp => exp.id === selectedId) || experiments[0] || null;
  const experimentMeasurements = mainexp
    ? measurements.filter((measurement) => measurement.station_number === mainexp.sensor_set_id)
    : measurements;
  const latest = experimentMeasurements.length > 0 ? experimentMeasurements[0] : null;
  const visibleSensorKeys = sensorSetKeys[mainexp?.sensor_set_id] || Object.keys(sensorRows);
  const visibleSensorRows = visibleSensorKeys
    .map((key) => ({ key, ...sensorRows[key] }))
    .filter((sensor) => sensor.field);
  const latestValueForSensor = (field) => {
    const measurement = experimentMeasurements.find((item) => item[field] !== null && item[field] !== undefined);
    return measurement?.[field];
  };

  const renderSensorRows = () => (
    <>
      {visibleSensorRows.map((sensor) => {
        const value = latestValueForSensor(sensor.field);

        return (
          <div className="row" key={sensor.key}>
            <span>{sensor.label}</span>
            <span>{value ?? "-"} {sensor.unit}</span>
          </div>
        );
      })}
      <div className="row"><span>Pump</span><span>{latest ? (latest.pump_on ? "ON" : "OFF") : "-"}</span></div>
    </>
  );

  const calculateProgress = (exp) => {
  if (!exp || exp.status === "not started") return 0;
  if (exp.status === "completed") return 100;
  if (!exp.started_at || !exp.planned_end_at) return 0;
  const start = new Date(exp.started_at).getTime();
  const end = new Date(exp.planned_end_at).getTime();
  const nowTs = new Date().getTime();

  if (nowTs >= end) return 100;
  if (nowTs <= start) return 0;

  const total = end - start;
  const elapsed = nowTs - start;
  return Math.round((elapsed / total) * 100);
  };

    const progressPercent = calculateProgress(mainexp);

  const sendPumpCommand = async (command) => {
    setIsSendingPumpCommand(true);
    setPumpCommandStatus("");

    try {
      const response = await fetch(`${API_BASE_URL}/pump-control/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error("Pump command request failed");
      }

      setSelectedPumpCommand(command);
      setPumpCommandStatus(`Command ${command} sent`);
    } catch (error) {
      console.error(error);
      setPumpCommandStatus("Command failed");
    } finally {
      setIsSendingPumpCommand(false);
    }
  };

  const pumpControls = (
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
  );

  return (
    <>
      <header className="header">
        <div className="logo" onClick={() => { setDetailsOpen(false); navigate('/dashboard'); }} style={{ cursor: 'pointer' }}>
          <img src={logo} alt="Cultiva logo" className="logo-img" />
          <h1>CULTIVA</h1>
        </div>
        <div className="icons">
          <span className="material-symbols-outlined">settings</span>
          <span className="material-symbols-outlined">account_circle</span>
          <span className="material-symbols-outlined">more_vert</span>
        </div>
      </header>

      <div className="container">

        {/* left */}
        <div className="card">
          <div className="image-placeholder" style={{ backgroundImage: `url(${bgImage})` }}>
            <div className="card-header">
              <div>
                <h2>{mainexp?.name || "Loading..."}</h2>
              </div>
              <div className="date">
                <span>{nowDate}</span>
                <span>{nowTime}</span>
              </div>
            </div>
            <div className='img-bottom'>
                <div className='progress-bar'>
                  <div className='progress' style={{ width: `${progressPercent}%` }} />
                </div>
                <span className={"status " + (mainexp?.status?.replace(/\s+/g, '-') || '')}>
                  {mainexp?.status 
                    ? (statusMap[mainexp.status] || mainexp.status.toUpperCase()) 
                    : "UNKNOWN"}
                </span>
              </div>
            </div>

          {detailsOpen ? (
            <div className="exp-details">
              <div className="exp-tags">
                {mainexp?.tags?.map((tag, i) => <span key={i} className="exp-tag">{tag}</span>)}
                <span className="exp-tag exp-tag-add">+</span>
              </div>
              <div className="exp-section">
                <span className="exp-label">Collaborators:</span>
                <div className="exp-collaborators">
                  {mainexp?.collaborators?.map((c, i) => (
                    <span key={i} className="collab-chip">{c} ×</span>
                  ))}
                  <span className="collab-chip collab-chip-add">+</span>
                  <span className="exp-show-all">Show all</span>
                </div>
              </div>
              <div className="exp-section">
                <span className="exp-label">Description:</span>
                <p className="exp-description">{mainexp?.description}</p>
              </div>
              <div className="export-dropdown">
                <button className="export-btn" onClick={() => setExportOpen(!exportOpen)}>
                  <span className="material-symbols-outlined">download</span>
                  <span>Export</span>
                  <span className="material-symbols-outlined">expand_more</span>
                </button>
                {exportOpen && (
                  <div className="export-menu">
                    <button onClick={() => { window.open(`http://localhost:8000/api/experiments/${selectedId}/export-csv/?export_format=csv`, '_blank'); setExportOpen(false); }}>CSV</button>
                    <button onClick={() => { window.open(`http://localhost:8000/api/experiments/${selectedId}/export-csv/?export_format=json`, '_blank'); setExportOpen(false); }}>JSON</button>
                  </div>
                )}
              </div>
              <div className="exp-actions">
                <span className="material-symbols-outlined">edit</span>
                <span className="material-symbols-outlined">settings</span>
                <span className="material-symbols-outlined">delete</span>
              </div>
            </div>
          ) : (
            <div className="stats">
              {renderSensorRows()}
              {pumpControls}
            </div>
          )}
        </div>

        {/* right wrapper */}
        <div className="right-panel-wrapper">

          {/* measurements panel - visible when details open */}
          {detailsOpen && (
            <div className="measurements-panel">
              <button className="action">
                <span>FULL EXPERIMENT HISTORY</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <ExperimentChart />
              <div className="readings-spacer" />
              <div className="readings-header">
                <span className="readings-title">LATEST READING</span>
                <div className="readings-date">
                  <span>{nowDate}</span>
                  <span>{nowTime}</span>
                </div>
              </div>
              <div className="stats">
                {renderSensorRows()}
                {pumpControls}
              </div>
              <p className="next-reading">Next reading in 23 minutes</p>
            </div>
          )}

          {/* arrow to bring back list */}
          {detailsOpen && (
            <button className="panel-toggle" onClick={() => setDetailsOpen(false)}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          )}

          {/* experiment list */}
          <div className={`dashboard${detailsOpen ? ' dashboard-hidden' : ''}`}>
            <div className="welcome">
              <h2>HELLO USER!</h2>
              <p>YOU HAVE CURRENTLY <strong style={{ color: 'var(--primary-green)' }}>{experiments.length}</strong> EXPERIMENTS</p>
            </div>

            <button className='add-btn' onClick={() => navigate('/new-experiment')}>
              <span>ADD A NEW EXPERIMENT</span>
              <span className="material-symbols-outlined">add</span>
            </button>

            <div className='section-header'>
              <span>ALL YOUR EXPERIMENTS</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>

            <div className='filters'>
              {Object.keys(statusMap).map((key) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`filter-btn filter-${key} ${filter === key ? "active" : ""}`}>
                  {statusMap[key]}
                </button>
              ))}
            </div>

            <div className="list">
              {filtered.map((exp) => (
                <div key={exp.id} className="item" onClick={() => navigate(`/experiment/${exp.id}`)}>
                  <p>{exp.name}</p>
                  <span className={`badge ${exp.status}`}>{statusMap[exp.status]}</span>
                  <span className="item-date">{exp.endDate}</span>
                </div>
              ))}
            </div>

            <button className='action'>
              <span>SEARCH FOR EXPERIMENTS</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>

            <button className='action'>
              <span>BROWSE REPORTS</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

        </div>
      </div>

      <div className="log">
        <h3>Measurements</h3>
        {experimentMeasurements.map((m, index) => (
          <div key={index}>
            [station {m.station_number}, pot {m.pot_number}]
            {visibleSensorRows.map((sensor) => (
              <span key={sensor.key}> {sensor.label}: {m[sensor.field] ?? "-"} {sensor.unit},</span>
            ))}
            pump: {m.pump_on ? "ON" : "OFF"}
          </div>
        ))}
      </div>
    </>
  )
}

export default App

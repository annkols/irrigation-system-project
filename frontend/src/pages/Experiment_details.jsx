import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import "../App.css";
import logo from "./images/logo-color.png";
import logoName from "./images/name-color.png";
import ExperimentChart from "./ExperimentChart";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const CAMERA_STREAM_URL = `${API_BASE_URL}/camera/stream/`;

const pumpCommands = ["ON", "OFF", "AUTO"];

const NAV_ITEMS = [
  { key: 'overview',  label: 'Overview',     icon: 'dashboard'   },
  { key: 'camera',    label: 'Camera view',  icon: 'videocam'    },
  { key: 'analytics', label: 'Analytics',    icon: 'bar_chart'   },
  { key: 'notes',     label: 'Notes',        icon: 'edit_note'   },
];

function Experiment_details() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [experiment, setExperiment] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [selectedPumpCommand, setSelectedPumpCommand] = useState(null);
  const [pumpCommandStatus, setPumpCommandStatus] = useState("");
  const [isSendingPumpCommand, setIsSendingPumpCommand] = useState(false);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [selectedColumns, setSelectedColumns] = useState({
    moisture_percent: true,
    air_temperature: true,
    air_humidity: true,
    soil_temperature: true,
    pressure_hpa: true,
    light_lux: true,
    pump_on: true,
  });
  const [lastSuccessTime, setLastSuccessTime] = useState(null);
  const [errors, setErrors] = useState({});

  const columnLabels = {
    moisture_percent: 'Soil moisture',
    air_temperature: 'Air temperature',
    air_humidity: 'Air humidity',
    soil_temperature: 'Soil temperature',
    pressure_hpa: 'Pressure',
    light_lux: 'Light intensity',
    pump_on: 'Pump status',
  };

  const handleExportClick = (format) => {
    setExportFormat(format);
    setExportOpen(false);
    setExportModalOpen(true);
  };

  const handleDownload = () => {
    const cols = Object.entries(selectedColumns)
      .filter(([_, checked]) => checked)
      .map(([key]) => key)
      .join(',');
    window.open(
      `${API_BASE_URL}/experiments/${id}/export-csv/?export_format=${exportFormat}&columns=${cols}`,
      '_blank'
    );
    setExportModalOpen(false);
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/experiments/${id}/`)
      .then(res => res.json())
      .then(data => setExperiment(data))
      .catch(err => console.error(err));

    const fetchMeasurements = () => {
      const currentTime = new Date().toLocaleString();
      fetch(`${API_BASE_URL}/measurements/`)
        .then(res => {
          if (!res.ok) throw new Error("Server error");
          return res.json();
        })
        .then(data => {
          if (!data || data.length === 0) throw new Error("No measurements available");
          setMeasurements(data);
          setLastSuccessTime(currentTime);
          setErrors(prev => ({ ...prev, measurements: null }));
        })
        .catch(() => {
          const successString = lastSuccessTime ?? "never";
          setErrors(prev => ({
            ...prev,
            measurements: `Failed to fetch measurements at ${currentTime}. Last successful fetch at ${successString}.`
          }));
        });
    };

    fetchMeasurements();
    const interval = setInterval(fetchMeasurements, 10000);
    return () => clearInterval(interval);
  }, [id, lastSuccessTime]);

  const handleEndExperiment = () => {
    toast(
      ({ closeToast }) => (
        <div>
          <p>Are you sure you want to end this experiment?</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={async () => {
                closeToast();
                try {
                  const response = await fetch(`${API_BASE_URL}/experiments/${id}/end/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  });
                  const data = await response.json();
                  if (!response.ok) { toast.error(data.detail || 'Failed to end the experiment.'); return; }
                  toast.success("Experiment has been successfully ended!");
                  setExperiment(data);
                } catch {
                  toast.error("Server connection error.");
                }
              }}
              style={{ padding: '4px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >Yes</button>
            <button onClick={closeToast} style={{ padding: '4px 12px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false }
    );
  };

  const handleDeleteExperiment = () => {
    toast(
      ({ closeToast }) => (
        <div>
          <p>Are you sure you want to <strong>delete</strong> this experiment permanently?</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={async () => {
                closeToast();
                try {
                  const response = await fetch(`${API_BASE_URL}/experiments/${id}/delete/`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                  });
                  if (!response.ok) {
                    let errorMsg = 'Failed to delete the experiment.';
                    try { const data = await response.json(); errorMsg = data.detail || errorMsg; } catch {}
                    toast.error(errorMsg);
                    return;
                  }
                  toast.success("Experiment has been successfully deleted!");
                  navigate('/dashboard');
                } catch {
                  toast.error("Server connection error.");
                }
              }}
              style={{ padding: '4px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >Delete</button>
            <button onClick={closeToast} style={{ padding: '4px 12px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false }
    );
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
      if (!response.ok) throw new Error();
      setSelectedPumpCommand(command);
      setPumpCommandStatus(`Command ${command} sent`);
    } catch {
      setPumpCommandStatus("Command failed");
    } finally {
      setIsSendingPumpCommand(false);
    }
  };

  const captureFrame = async () => {
    setIsCapturingFrame(true);
    try {
      const response = await fetch(`${API_BASE_URL}/experiments/${id}/frames/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to save frame.");
      toast.success("Frame saved successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to save frame.");
    } finally {
      setIsCapturingFrame(false);
    }
  };

  const calculateProgress = (exp) => {
    if (!exp?.started_at || !exp?.planned_end_at) return 0;
    const start = new Date(exp.started_at).getTime();
    const end = new Date(exp.planned_end_at).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pl-PL");
  };

  if (!experiment) return <div style={{ padding: 40 }}>Loading...</div>;

  const latest = measurements.length > 0 ? measurements[0] : null;
  const progressPercent = calculateProgress(experiment);

  const now = new Date();
  const nowDateTime = `${now.toLocaleDateString("pl-PL")} ${now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="exp-layout">
      {/* Left sidebar */}
      <aside className="exp-sidebar">
        <div className="exp-sidebar-logo" onClick={() => navigate('/dashboard')}>
          <img src={logo} alt="Logo" style={{ height: '64px', width: 'auto' }} />
          <img src={logoName} alt="PlantStalker" style={{ height: '32px', width: 'auto' }} />
        </div>

        <div className="exp-sidebar-meta">
          <p className="exp-sidebar-exp-name">{experiment.name}</p>
          <p className="exp-sidebar-exp-sub">
            {experiment.plant_name && <span>{experiment.plant_name}</span>}
            {experiment.is_public
              ? <span className="exp-sidebar-badge exp-sidebar-badge--public">Public</span>
              : <span className="exp-sidebar-badge exp-sidebar-badge--private">Private</span>
            }
          </p>
        </div>

        <p className="exp-sidebar-section-label">EXPERIMENT CONTROLS</p>

        <nav className="exp-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`exp-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="exp-main">
        {/* Topbar */}
        <div className="exp-topbar">
          <div className="exp-breadcrumb">
            <span className="exp-breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span>
            <span className="exp-breadcrumb-sep">›</span>
            <span>{experiment.name}</span>
          </div>
          <div className="exp-topbar-actions">
            <span className="material-symbols-outlined exp-topbar-icon">notifications</span>
            <span className="material-symbols-outlined exp-topbar-icon">settings</span>
            <span className="material-symbols-outlined exp-topbar-icon">account_circle</span>
          </div>
        </div>

        {/* Tab content */}
        <div className="exp-content">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="exp-tab-overview">
              <div className="exp-tab-header">
                <h1 className="exp-tab-title">{experiment.name}</h1>
                <div className="exp-tab-actions">
                  <button className="exp-icon-btn" onClick={() => navigate(`/experiment/${id}/edit`)} title="Edit">
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button className="exp-icon-btn exp-icon-btn--danger" onClick={handleDeleteExperiment} title="Delete">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              {/* Status + progress */}
              <div className="exp-status-row">
                <div className="exp-status-bar-wrap">
                  <div className="exp-status-bar">
                    <div className="exp-status-bar-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <span className="exp-status-pct">{progressPercent}%</span>
                </div>
                <span className="exp-status-label">{experiment.is_public ? "Public" : "Private"}</span>
              </div>

              {/* Info grid */}
              <div className="exp-info-grid">
                <div className="exp-info-field">
                  <span className="exp-info-label">Plant type</span>
                  <span>{experiment.plant_name || "-"}</span>
                </div>
                <div className="exp-info-field">
                  <span className="exp-info-label">Description</span>
                  <p className="exp-info-desc">{experiment.description || "-"}</p>
                </div>

                {experiment.tags?.length > 0 && (
                  <div className="exp-info-field">
                    <span className="exp-info-label">Tags</span>
                    <div className="exp-details-tags">
                      {experiment.tags.map((tag, i) => <span key={i} className="exp-tag">{tag}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Dates row */}
              <div className="exp-dates-row">
                <div className="exp-date-field">
                  <span className="exp-info-label">Start date</span>
                  <span>{formatDate(experiment.started_at)}</span>
                </div>
                <div className="exp-date-field">
                  <span className="exp-info-label">Planned end date</span>
                  <span>{formatDate(experiment.planned_end_at)}</span>
                </div>
                <div className="exp-date-field">
                  <span className="exp-info-label">End date</span>
                  <span>{formatDate(experiment.finished_at)}</span>
                </div>
                {experiment.started_at && !experiment.finished_at && (
                  <button className="end-experiment-btn" onClick={handleEndExperiment}>
                    <span className="material-symbols-outlined">check</span>
                    END EXPERIMENT
                  </button>
                )}
              </div>

              {/* Collaborators */}
              <div className="exp-info-field">
                <span className="exp-info-label">Collaborators</span>
                <div className="exp-collaborators">
                  {experiment.collaborators?.length > 0
                    ? experiment.collaborators.map((c, i) => <span key={i} className="collab-chip">{c}</span>)
                    : <span style={{ color: '#888', fontSize: '14px' }}>None</span>
                  }
                </div>
              </div>

              {/* Measurement error */}
              {errors.measurements && (
                <span className="error-text">{errors.measurements}</span>
              )}

              {/* Sensor readings */}
              <div className="exp-readings-card">
                <div className="exp-readings-header">
                  <span className="exp-readings-title">Last reading</span>
                  <span className="exp-readings-time">{nowDateTime}</span>
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

              {/* Export */}
              <div className="export-dropdown">
                <button className="export-btn" onClick={() => setExportOpen(!exportOpen)}>
                  <span className="material-symbols-outlined">download</span>
                  EXPORT RAW MEASUREMENTS
                  <span className="material-symbols-outlined">expand_more</span>
                </button>
                {exportOpen && (
                  <div className="export-menu">
                    <button onClick={() => handleExportClick('csv')}>CSV</button>
                    <button onClick={() => handleExportClick('excel')}>Excel</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CAMERA VIEW ── */}
          {activeTab === 'camera' && (
            <div className="exp-tab-camera">
              <h2 className="exp-tab-section-title">Camera view</h2>
              <div className="exp-camera-main">
                <img src={CAMERA_STREAM_URL} alt="Camera stream" className="exp-camera-stream" />
                <div className="exp-camera-controls">
                  <button className="capture-frame-btn" disabled={isCapturingFrame} onClick={captureFrame}>
                    <span className="material-symbols-outlined">photo_camera</span>
                    {isCapturingFrame ? "Saving..." : "Save frame"}
                  </button>
                  <button className="saved-frames-btn" onClick={() => navigate(`/experiment/${id}/frames`)}>
                    <span className="material-symbols-outlined">photo_library</span>
                    Saved frames
                  </button>
                </div>
              </div>

              <div className="pump-control" style={{ maxWidth: 320, marginTop: 24 }}>
                <div className="pump-control-header">
                  <span>Pump control</span>
                  <span className="pump-control-state">
                    {latest ? (latest.pump_on ? "RUNNING" : "STOPPED") : "NO DATA"}
                  </span>
                </div>
                <div className="pump-command-buttons">
                  {pumpCommands.map(cmd => (
                    <button
                      key={cmd}
                      className={`pump-command-btn ${selectedPumpCommand === cmd ? 'active' : ''}`}
                      disabled={isSendingPumpCommand}
                      onClick={() => sendPumpCommand(cmd)}
                    >{cmd}</button>
                  ))}
                </div>
                {pumpCommandStatus && (
                  <p className={pumpCommandStatus.includes("failed") ? "pump-command-error" : "pump-command-status"}>
                    {pumpCommandStatus}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' && (
            <div className="exp-tab-analytics">
              <ExperimentChart sensorSetId={experiment?.sensor_set_id} />
            </div>
          )}

          {/* ── NOTES ── */}
          {activeTab === 'notes' && (
            <div className="exp-tab-notes">
              <h2 className="exp-tab-section-title">Notes</h2>
              <textarea
                className="exp-notes-textarea"
                placeholder="Add your notes about this experiment here..."
              />
            </div>
          )}

        </div>
      </div>

      {/* Export modal */}
      {exportModalOpen && (
        <div className="export-modal-overlay" onClick={() => setExportModalOpen(false)}>
          <div className="export-modal" onClick={e => e.stopPropagation()}>
            <h3>Select sensors to export</h3>
            <div className="export-checkboxes">
              {Object.entries(columnLabels).map(([key, label]) => (
                <label key={key} className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedColumns[key]}
                    onChange={() => setSelectedColumns(prev => ({ ...prev, [key]: !prev[key] }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="export-modal-buttons">
              <button className="export-cancel-btn" onClick={() => setExportModalOpen(false)}>Cancel</button>
              <button className="export-download-btn" onClick={handleDownload}>Download {exportFormat.toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Experiment_details;

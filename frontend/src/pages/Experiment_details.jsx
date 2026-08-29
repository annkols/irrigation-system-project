import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import "../App.css";
import logo from "./images/logo-color.png";
import logoName from "./images/name-color.png";
import ExperimentChart from "./ExperimentChart";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const pumpCommands = ["ON", "OFF", "AUTO"];

const NAV_ITEMS = [
  { key: 'overview',  label: 'Overview',        icon: 'dashboard'   },
  { key: 'camera',    label: 'Camera view',     icon: 'videocam'    },
  { key: 'analytics', label: 'Analytics',       icon: 'bar_chart'   },
  { key: 'notes',     label: 'Notes',           icon: 'edit_note'   },
  { key: 'history',   label: 'Historical data', icon: 'table_rows'  },
];

function Experiment_details() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('overview');
  const [experiment, setExperiment] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [selectedPumpCommand, setSelectedPumpCommand] = useState(null);
  const [pumpCommandStatus, setPumpCommandStatus] = useState("");
  const [isSendingPumpCommand, setIsSendingPumpCommand] = useState(false);
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
  const [errorTime, setErrorTime] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [draftNote, setDraftNote] = useState({ title: '', content: '', imageUrl: null, imageFile: null });
  const [openNote, setOpenNote] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

    fetch(`${API_BASE_URL}/experiments/${id}/notes/`)
      .then(res => res.json())
      .then(data => setNotes(data))
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
          setErrorTime(null);
        })
        .catch(() => {
          const successString = lastSuccessTime ?? "never";
          setErrorTime(new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }));
          setErrors(prev => ({
            ...prev,
            measurements: `Failed to fetch sensor data. Last successful fetch: ${successString}.`
          }));
        });
    };

    fetchMeasurements();
    const interval = setInterval(fetchMeasurements, 10000);
    return () => clearInterval(interval);
  }, [id, lastSuccessTime]);

  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
      <ToastContainer
         position="top-right"
        autoClose={3000}
        toastClassName="custom-toast"
      />

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

     
      <div className="exp-main">
       
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

       
        <div className="exp-content">

         
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

              {/* Info card: Plant type, Description, Collaborators */}
              <div className="exp-overview-card">
                <div className="exp-overview-field">
                  <span className="exp-info-label">Plant type</span>
                  <span>{experiment.plant_name || "-"}</span>
                </div>
                <div className="exp-overview-field">
                  <span className="exp-info-label">Description</span>
                  <p className="exp-info-desc" style={{ margin: 0 }}>{experiment.description || "-"}</p>
                </div>
                {experiment.tags?.length > 0 && (
                  <div className="exp-overview-field">
                    <span className="exp-info-label">Tags</span>
                    <div className="exp-details-tags">
                      {experiment.tags.map((tag, i) => <span key={i} className="exp-tag">{tag}</span>)}
                    </div>
                  </div>
                )}
                <div className="exp-overview-field exp-overview-field--last">
                  <span className="exp-info-label">Collaborators</span>
                  <div className="exp-collaborators">
                    {experiment.collaborators?.length > 0
                      ? experiment.collaborators.map((c, i) => <span key={i} className="collab-chip">{c}</span>)
                      : <span style={{ color: '#888', fontSize: '14px' }}>None</span>
                    }
                  </div>
                </div>
              </div>

              {/* Dates card */}
              <div className="exp-overview-card exp-overview-card--dates">
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
                </div>
                {experiment.started_at && !experiment.finished_at && (
                  <button className="end-experiment-btn end-experiment-btn--new" onClick={handleEndExperiment}>
                    <span className="material-symbols-outlined">check</span>
                    END EXPERIMENT
                  </button>
                )}
              </div>

              {/* Experiment Alerts */}
              <div className="exp-alerts-section">
                <div className="exp-alerts-header">
                  <div className="exp-alerts-title-row">
                    <span className="exp-alerts-title">Experiment Alerts</span>
                    {errors.measurements && <span className="exp-alerts-badge">1 Critical</span>}
                  </div>
                  <span className="exp-alerts-view-all">View All Notifications</span>
                </div>

                {errors.measurements ? (
                  <div className="exp-alert-item">
                    <div className="exp-alert-icon exp-alert-icon--critical">
                      <span className="material-symbols-outlined">error</span>
                    </div>
                    <div className="exp-alert-content">
                      <span className="exp-alert-name">Measurement Fetch Failed</span>
                      <span className="exp-alert-desc">{errors.measurements}</span>
                    </div>
                    {errorTime && <span className="exp-alert-time">{errorTime}</span>}
                  </div>
                ) : (
                  <div className="exp-alert-item">
                    <div className="exp-alert-icon exp-alert-icon--ok">
                      <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div className="exp-alert-content">
                      <span className="exp-alert-name">All systems normal</span>
                      <span className="exp-alert-desc">Sensors reporting as expected.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sensor readings */}
              <div className="exp-sensors-section">
                <div className="exp-sensors-header">
                  <span className="exp-sensors-title">Live Sensors</span>
                  <span className="exp-sensors-time">Updated: {nowDateTime}</span>
                </div>
                <div className="exp-sensors-grid">
                  {[
                    { icon: 'device_thermostat', label: 'Temp Inside',     value: latest?.air_temperature,  unit: '°C'  },
                    { icon: 'water_drop',        label: 'Soil Moisture',   value: latest?.moisture_percent, unit: '%'   },
                    { icon: 'cloud',             label: 'Air Humidity',    value: latest?.air_humidity,     unit: '%'   },
                    { icon: 'light_mode',        label: 'Light Intensity', value: latest?.light_lux,        unit: 'lx'  },
                    { icon: 'thermostat',        label: 'Soil Temp',       value: latest?.soil_temperature, unit: '°C'  },
                    { icon: 'speed',             label: 'Pressure',        value: latest?.pressure_hpa,     unit: 'hPa' },
                  ].map(({ icon, label, value, unit }) => (
                    <div key={label} className="exp-sensor-card">
                      <span className="material-symbols-outlined exp-sensor-icon">{icon}</span>
                      <span className="exp-sensor-label">{label}</span>
                      <span className="exp-sensor-value">
                        {value ?? '-'}{value != null && <span className="exp-sensor-unit">{unit}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pump control */}
              <div className="exp-pump-control">
                <div className="exp-pump-header">
                  <span className="exp-pump-label">PUMP CONTROL</span>
                  <span className={`exp-pump-status ${latest?.pump_on ? 'running' : 'stopped'}`}>
                    STATUS: {latest ? (latest.pump_on ? 'RUNNING' : 'STOPPED') : 'NO DATA'}
                  </span>
                </div>
                <div className="exp-pump-buttons">
                  {pumpCommands.map(cmd => (
                    <button
                      key={cmd}
                      className={`exp-pump-btn ${selectedPumpCommand === cmd ? 'active' : ''}`}
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

          {/* ── CAMERA VIEW ── */}
          {activeTab === 'camera' && (
            <div className="exp-tab-camera">
              <h2 className="exp-tab-section-title">Camera view</h2>
              <div className="exp-camera-main">
                <div className="exp-camera-frame-wrap">
                  <img
                    src={`${API_BASE_URL}/experiments/${id}/frames/latest/image/`}
                    alt="Latest camera frame"
                    className="exp-camera-stream"
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling?.classList.add('exp-camera-placeholder-visible');
                    }}
                  />
                  <div className="exp-camera-placeholder">
                    <span className="material-symbols-outlined">photo_camera</span>
                    <span>No camera feed available</span>
                  </div>
                </div>
                <div className="exp-camera-controls">
                  <button className="saved-frames-btn" onClick={() => navigate(`/experiment/${id}/frames`)}>
                    <span className="material-symbols-outlined">photo_library</span>
                    Saved frames
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' && (
            <div className="exp-tab-analytics">
              <ExperimentChart sensorSetId={experiment?.sensor_set_id} />
            </div>
          )}

          {/* ── HISTORICAL DATA ── */}
          {activeTab === 'history' && (
            <div className="exp-tab-history">
              <div className="exp-tab-header">
                <h2 className="exp-tab-title">Historical data</h2>
                <div className="export-dropdown">
                  <button className="export-btn" onClick={() => setExportOpen(!exportOpen)}>
                    <span className="material-symbols-outlined">download</span>
                    Export
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

              {measurements.length === 0 ? (
                <div className="exp-empty-state">
                  <span className="material-symbols-outlined">table_rows</span>
                  <p>No measurements recorded yet.</p>
                </div>
              ) : (
                <div className="exp-history-table-wrap">
                  <table className="exp-history-table">
                    <thead>
                      <tr>
                        <th>Date & time</th>
                        <th>Air temp. (°C)</th>
                        <th>Soil moisture (%)</th>
                        <th>Air humidity (%)</th>
                        <th>Light (lx)</th>
                        <th>Soil temp. (°C)</th>
                        <th>Pressure (hPa)</th>
                        <th>Pump</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements.map((m, i) => (
                        <tr key={i}>
                          <td>{m.timestamp ? new Date(m.timestamp).toLocaleString('pl-PL') : '-'}</td>
                          <td>{m.air_temperature ?? '-'}</td>
                          <td>{m.moisture_percent ?? '-'}</td>
                          <td>{m.air_humidity ?? '-'}</td>
                          <td>{m.light_lux ?? '-'}</td>
                          <td>{m.soil_temperature ?? '-'}</td>
                          <td>{m.pressure_hpa ?? '-'}</td>
                          <td>{m.pump_on != null ? (m.pump_on ? 'ON' : 'OFF') : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {activeTab === 'notes' && (
            <div className="exp-tab-notes">
              {openNote ? (
                <>
                  <button className="note-back-btn" onClick={() => { setOpenNote(null); setLightboxOpen(false); }}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    Timeline Observations
                  </button>

                  <div className="note-detail-card">
                    <span className="note-date">
                      {new Date(openNote.created_at || openNote.createdAt).toLocaleString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <h2 className="note-detail-title">{openNote.title}</h2>
                    {openNote.content && <p className="note-detail-content">{openNote.content}</p>}
                    {(openNote.image_url || openNote.imageUrl) && (
                      <img
                        src={openNote.image_url || openNote.imageUrl}
                        alt="Note attachment"
                        className="note-detail-image"
                        onClick={() => setLightboxOpen(true)}
                        title="Click to enlarge"
                      />
                    )}
                    <div className="note-detail-actions">
                      <button className="note-delete-inline-btn" onClick={async () => {
                        try {
                          await fetch(`${API_BASE_URL}/notes/${openNote.id}/`, { method: 'DELETE' });
                        } catch {}
                        setNotes(prev => prev.filter(n => n.id !== openNote.id));
                        setOpenNote(null);
                      }}>
                        <span className="material-symbols-outlined">delete</span>
                        Delete note
                      </button>
                    </div>
                  </div>

                  {lightboxOpen && (
                    <div className="note-lightbox" onClick={() => setLightboxOpen(false)}>
                      <img src={openNote.image_url || openNote.imageUrl} alt="Full size" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="notes-header">
                    <button className="notes-new-btn" onClick={() => setNoteFormOpen(true)}>
                      <span className="material-symbols-outlined">add</span>
                      New Note
                    </button>
                  </div>

                  <div className="notes-timeline-header">
                    <span className="notes-timeline-title">Timeline Observations</span>
                  </div>

                  <div className="notes-list">
                    {notes.length === 0 ? (
                      <div className="notes-empty">
                        <span className="material-symbols-outlined">edit_note</span>
                        <p>No notes yet. Click "+ New Note" to add your first observation.</p>
                      </div>
                    ) : (
                      notes.map(note => (
                        <div key={note.id} className="note-card" onClick={() => setOpenNote(note)}>
                          <div className="note-card-main">
                            <span className="note-date">
                              {new Date(note.created_at || note.createdAt).toLocaleString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            <h3 className="note-title">{note.title}</h3>
                            {note.content && <p className="note-content">{note.content}</p>}
                          </div>
                          {(note.image_url || note.imageUrl) && (
                            <img src={note.image_url || note.imageUrl} alt="Note attachment" className="note-image" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {noteFormOpen && (
                <div className="note-modal-overlay" onClick={() => setNoteFormOpen(false)}>
                  <div className="note-modal" onClick={e => e.stopPropagation()}>
                    <h3 className="note-modal-title">New Observation</h3>
                    <input
                      className="note-input"
                      type="text"
                      placeholder="Title"
                      value={draftNote.title}
                      onChange={e => setDraftNote(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <textarea
                      className="note-textarea"
                      placeholder="Describe your observation..."
                      value={draftNote.content}
                      onChange={e => setDraftNote(prev => ({ ...prev, content: e.target.value }))}
                    />
                    <label className="note-image-upload">
                      <span className="material-symbols-outlined">add_photo_alternate</span>
                      {draftNote.imageUrl ? 'Change image' : 'Add image'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) setDraftNote(prev => ({
                            ...prev,
                            imageFile: file,
                            imageUrl: URL.createObjectURL(file),
                          }));
                        }}
                      />
                    </label>
                    {draftNote.imageUrl && (
                      <img src={draftNote.imageUrl} alt="Preview" className="note-image-preview" />
                    )}
                    <div className="note-modal-actions">
                      <button className="note-cancel-btn" onClick={() => {
                        setNoteFormOpen(false);
                        setDraftNote({ title: '', content: '', imageUrl: null });
                      }}>Cancel</button>
                      <button
                        className="note-save-btn"
                        disabled={!draftNote.title.trim()}
                        onClick={async () => {
                          const formData = new FormData();
                          formData.append('title', draftNote.title);
                          formData.append('content', draftNote.content);
                          if (draftNote.imageFile) formData.append('image', draftNote.imageFile);
                          try {
                            const res = await fetch(`${API_BASE_URL}/experiments/${id}/notes/`, {
                              method: 'POST',
                              body: formData,
                            });
                            if (res.ok) {
                              const saved = await res.json();
                              setNotes(prev => [saved, ...prev]);
                            } else {
                              const errBody = await res.json().catch(() => ({}));
                              console.error('Note save error:', res.status, errBody);
                              toast.error(`Failed to save note (${res.status}).`);
                            }
                          } catch {
                            toast.error('Server connection error.');
                          }
                          setNoteFormOpen(false);
                          setDraftNote({ title: '', content: '', imageUrl: null, imageFile: null });
                        }}
                      >Save Note</button>
                    </div>
                  </div>
                </div>
              )}
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

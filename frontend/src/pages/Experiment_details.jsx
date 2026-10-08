import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from "react-toastify";
import "../App.css";
import logo from "./images/logo-color.png";
import logoName from "./images/name-color.png";
import TopBar from "./Topbar";
import ExperimentChart from "./ExperimentChart";
import PotComparisonChart from "./PotComparisonChart";
import { useTranslation } from "react-i18next";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const pumpCommands = ["ON", "OFF", "AUTO"];
const latestNonNull = rows => rows.length ? rows.reduceRight((result, row) => ({ ...result, ...Object.fromEntries(Object.entries(row).filter(([, value]) => value != null)) }), {}) : null;
const DAYLIGHT_PPFD_FACTOR = 0.0185;
const RED_LIGHT_SHARE = 700 / (700 + 400);
const BLUE_LIGHT_SHARE = 400 / (700 + 400);
const SOWELO_PPFD_FACTOR = RED_LIGHT_SHARE / 41.3 + BLUE_LIGHT_SHARE / 15.1;

const NAV_ITEMS = [
  { key: 'overview',  labelKey: 'experimentForm.overview',  icon: 'dashboard'  },
  { key: 'camera',    labelKey: 'experimentForm.camera',    icon: 'videocam'   },
  { key: 'analytics', labelKey: 'experimentForm.analytics', icon: 'bar_chart'  },
  { key: 'notes',     labelKey: 'experimentForm.notes',     icon: 'edit_note'  },
  { key: 'history',   labelKey: 'experimentForm.history',   icon: 'table_rows' },
];

function Experiment_details() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const hasShownToast = useRef(false);

  const [activeTab, setActiveTab] = useState(() => {
    return location.state?.defaultTab || 'overview';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );
  const [experiment, setExperiment] = useState(null);
  const [design, setDesign] = useState(null);
  const [selectedPot, setSelectedPot] = useState(null);
  const [selectedCameraPot, setSelectedCameraPot] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [selectedPumpCommand, setSelectedPumpCommand] = useState(null);
  const [pumpCommandStatus, setPumpCommandStatus] = useState("");
  const [pumpCommandHasError, setPumpCommandHasError] = useState(false);
  const [isSendingPumpCommand, setIsSendingPumpCommand] = useState(false);
  const [pumpDurationSeconds, setPumpDurationSeconds] = useState("3");
  const [lightCalculatorLux, setLightCalculatorLux] = useState(null);
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
  const lastSuccessTime = useRef(null);
  const [errors, setErrors] = useState({});
  const [errorTime, setErrorTime] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [draftNote, setDraftNote] = useState({ title: '', content: '', images: [] });
  const [openNote, setOpenNote] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [noteEditMode, setNoteEditMode] = useState(false);
  const [noteEditDraft, setNoteEditDraft] = useState({ title: '', content: '' });
  const [noteBusy, setNoteBusy] = useState(false);

  const columnLabels = {
    moisture_percent: t('experimentForm.sensors.soilMoisture'),
    air_temperature: t('experimentForm.sensors.airTemperature'),
    air_humidity: t('experimentForm.sensors.airHumidity'),
    soil_temperature: t('experimentForm.sensors.soilTemperature'),
    pressure_hpa: t('experimentForm.sensors.pressure'),
    light_lux: t('experimentForm.sensors.light'),
    pump_on: t('experimentDetails.pumpStatus'),
  };

  const handleExportClick = (format) => {
    setExportFormat(format);
    setExportOpen(false);
    setExportModalOpen(true);
  };

  const handleDownload = () => {
    const cols = Object.entries(selectedColumns)
      .filter(([, checked]) => checked)
      .map(([key]) => key)
      .join(',');
    window.open(
      `${API_BASE_URL}/experiments/${id}/export-csv/?export_format=${exportFormat}&columns=${cols}&pot_number=${selectedPot ?? ""}`,
      '_blank'
    );
    setExportModalOpen(false);
  };

  const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

  // Bez Content-Type — przeglądarka sama ustawi boundary dla FormData
  const getAuthTokenHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const closeNote = () => {
    setOpenNote(null);
    setNoteEditMode(false);
    setLightboxUrl(null);
  };

  // Odświeża pojedynczą notatkę z backendu (po dodaniu/usunięciu zdjęcia lub edycji)
  const refreshNote = async (noteId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/notes/${noteId}/`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const fresh = await res.json();
      setNotes(prev => prev.map(n => (n.id === fresh.id ? fresh : n)));
      setOpenNote(prev => (prev && prev.id === fresh.id ? fresh : prev));
    } catch {
      // The existing note remains visible if refreshing it fails.
    }
  };

  const handleSaveNoteEdit = async () => {
    if (!openNote || !noteEditDraft.title.trim()) return;
    setNoteBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notes/${openNote.id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: noteEditDraft.title.trim(),
          content: noteEditDraft.content,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
        setOpenNote(updated);
        setNoteEditMode(false);
      } else {
        toast.error(t('experimentDetails.errors.updateNote', { status: res.status }));
      }
    } catch {
      toast.error(t('experimentForm.errors.connection'));
    }
    setNoteBusy(false);
  };

  const handleAddNoteImages = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!openNote || files.length === 0) return;
    setNoteBusy(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));
      const res = await fetch(`${API_BASE_URL}/notes/${openNote.id}/`, {
        method: 'PATCH',
        headers: getAuthTokenHeader(),
        body: formData,
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
        setOpenNote(updated);
      } else {
        toast.error(t('experimentDetails.errors.addImage', { status: res.status }));
      }
    } catch {
      toast.error(t('experimentForm.errors.connection'));
    }
    setNoteBusy(false);
  };

  const handleDeleteNoteImage = async (imageId) => {
    if (!openNote) return;
    setNoteBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/note-images/${imageId}/`, {
        method: 'DELETE',
        headers: getAuthTokenHeader(),
      });
      if (res.ok || res.status === 404) {
        await refreshNote(openNote.id);
      } else {
        toast.error(t('experimentDetails.errors.deleteImage', { status: res.status }));
      }
    } catch {
      toast.error(t('experimentForm.errors.connection'));
    }
    setNoteBusy(false);
  };

  const handleDeleteNote = async () => {
    if (!openNote) return;
    setNoteBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notes/${openNote.id}/`, {
        method: 'DELETE',
        headers: getAuthTokenHeader(),
      });
      if (res.ok || res.status === 404) {
        setNotes(prev => prev.filter(n => n.id !== openNote.id));
        closeNote();
      } else {
        toast.error(t('experimentDetails.errors.deleteNote', { status: res.status }));
      }
    } catch {
      toast.error(t('experimentForm.errors.connection'));
    }
    setNoteBusy(false);
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/experiments/${id}/`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setExperiment(data))
      .catch(err => console.error(err));

    fetch(`${API_BASE_URL}/experiments/${id}/notes/`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setNotes(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    const fetchMeasurements = () => {
      const currentTime = new Date().toLocaleString();
      fetch(`${API_BASE_URL}/measurements/?experiment_id=${id}`, { headers: getAuthHeaders() })
        .then(res => {
          if (!res.ok) throw new Error("Server error");
          return res.json();
        })
        .then(data => {
          if (!data || data.length === 0) throw new Error("No measurements available");
          setMeasurements(data);
          lastSuccessTime.current = currentTime;
          setErrors(prev => ({ ...prev, measurements: null }));
          setErrorTime(null);
        })
        .catch(() => {
          const successString = lastSuccessTime.current ?? t('experimentDetails.never');
          setErrorTime(new Date().toLocaleTimeString(i18n.resolvedLanguage, { hour: "2-digit", minute: "2-digit" }));
          setErrors(prev => ({
            ...prev,
            measurements: t('experimentDetails.errors.measurements', { time: successString })
          }));
        });
    };

    fetchMeasurements();
    const interval = setInterval(fetchMeasurements, 10000);
    return () => clearInterval(interval);
  }, [id, i18n.resolvedLanguage, t]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/experiments/${id}/design/`, { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Design unavailable")))
      .then(data => setDesign(data))
      .catch(() => setDesign(null));
  }, [id]);

  const potNumbers = useMemo(() => {
    const planned = experiment?.pot_numbers || [];
    const measured = measurements
      .filter((measurement) => measurement.experiment_id === experiment?.id)
      .map((measurement) => measurement.pot_number);
    const available = planned.length ? planned : measured;
    return [...new Set(available)].sort((a, b) => a - b);
  }, [experiment, measurements]);

  const cameraPotNumbers = useMemo(() => {
    if (!design?.camera_assignments?.length) return [];
    const potsById = new Map(design.pots.map((pot) => [pot.id, pot.position]));
    return [...new Set(
      design.camera_assignments
        .map((assignment) => potsById.get(assignment.pot_id))
        .filter((position) => position != null)
    )].sort((a, b) => a - b);
  }, [design]);

  useEffect(() => {
    if (potNumbers.length && !potNumbers.includes(selectedPot)) setSelectedPot(potNumbers[0]);
  }, [potNumbers, selectedPot]);

  useEffect(() => {
    if (cameraPotNumbers.length && !cameraPotNumbers.includes(selectedCameraPot)) {
      setSelectedCameraPot(cameraPotNumbers[0]);
    }
    if (!cameraPotNumbers.length && selectedCameraPot !== null) setSelectedCameraPot(null);
  }, [cameraPotNumbers, selectedCameraPot]);

  const stationMeasurements = useMemo(() => {
    if (!experiment) return [];
    return measurements.filter(
      (measurement) => measurement.experiment_id === experiment.id
    );
  }, [experiment, measurements]);

  const selectedMeasurements = useMemo(
    () => stationMeasurements.filter(
      (measurement) => measurement.pot_number === selectedPot
    ),
    [stationMeasurements, selectedPot]
  );

  useEffect(() => {
    setSelectedPumpCommand(null);
    setPumpCommandStatus("");
    setPumpCommandHasError(false);
    if (!experiment || selectedPot == null) return undefined;

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/pump-control/latest/?station_number=${experiment.sensor_set_id}&pot_number=${selectedPot}`, {
      signal: controller.signal,
      headers: getAuthHeaders(),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setSelectedPumpCommand(data?.command || null))
      .catch((error) => {
        if (error.name !== "AbortError") setSelectedPumpCommand(null);
      });
    return () => controller.abort();
  }, [experiment, selectedPot]);

  useEffect(() => {
    const message = location.state?.message || location.state?.successMessage;

    if (message && !hasShownToast.current) {
      // Oznaczamy, że toast dla tego przejścia został już wyświetlony
      hasShownToast.current = true;
  
      // Wyświetlamy powiadomienie
      toast.success(message);
     // Czyścimy stan w React Routerze (bez przeładowania strony)
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleEndExperiment = () => {
    toast(
      ({ closeToast }) => (
        <div>
          <p>{t('experimentDetails.confirmEnd')}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={async () => {
                closeToast();
                try {
                  const response = await fetch(`${API_BASE_URL}/experiments/${id}/end/`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                  });
                  const data = await response.json();
                  if (!response.ok) { toast.error(data.detail || t('experimentDetails.errors.end')); return; }
                  toast.success(t('experimentDetails.ended'));
                  setExperiment(data);
                } catch {
                  toast.error(t('experimentForm.errors.connection'));
                }
              }}
              style={{ padding: '4px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >{t('profile.yes')}</button>
            <button onClick={closeToast} style={{ padding: '4px 12px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{t('experimentForm.cancel')}</button>
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
          <p>{t('experimentDetails.confirmDelete')}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={async () => {
                closeToast();
                try {
                  const response = await fetch(`${API_BASE_URL}/experiments/${id}/delete/`, {
                    method: 'DELETE',
                    headers: getAuthHeaders(),
                  });
                  if (!response.ok) {
                    let errorMsg = t('experimentDetails.errors.deleteExperiment');
                    try {
                      const data = await response.json();
                      errorMsg = data.detail || errorMsg;
                    } catch {
                      // Keep the translated fallback when the response has no JSON body.
                    }
                    toast.error(errorMsg);
                    return;
                  }
                  toast.success(t('experimentDetails.deleted'));
                  navigate('/dashboard');
                } catch {
                  toast.error(t('experimentForm.errors.connection'));
                }
              }}
              style={{ padding: '4px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >{t('experimentDetails.delete')}</button>
            <button onClick={closeToast} style={{ padding: '4px 12px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{t('experimentForm.cancel')}</button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false }
    );
  };

  const sendPumpCommand = async (command, durationSeconds = null) => {
    setIsSendingPumpCommand(true);
    setPumpCommandStatus("");
    setPumpCommandHasError(false);
    try {
      const response = await fetch(`${API_BASE_URL}/pump-control/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          command,
          ...(durationSeconds != null && { duration_seconds: durationSeconds }),
          station_number: experiment.sensor_set_id,
          pot_number: selectedPot,
        }),
      });
      if (!response.ok) throw new Error();
      setSelectedPumpCommand(command);
      setPumpCommandStatus(durationSeconds == null
        ? t('experimentDetails.commandSent', { command })
        : t('experimentDetails.timedCommandSent', { seconds: durationSeconds }));
    } catch {
      setPumpCommandStatus(t('experimentDetails.errors.command'));
      setPumpCommandHasError(true);
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
    return new Date(dateStr).toLocaleDateString(i18n.resolvedLanguage);
  };

  if (!experiment) return <div style={{ padding: 40 }}>{t('common.loading')}</div>;

  const latest = latestNonNull(selectedMeasurements);
  const latestShared = latestNonNull(stationMeasurements);
  const calculatorLuxValue = lightCalculatorLux ?? latestShared?.light_lux ?? "";
  const calculatorLux = Number(calculatorLuxValue);
  const hasCalculatorLux = calculatorLuxValue !== "" && Number.isFinite(calculatorLux) && calculatorLux >= 0;
  const progressPercent = calculateProgress(experiment);

  const now = new Date();
  const nowDateTime = `${now.toLocaleDateString(i18n.resolvedLanguage)} ${now.toLocaleTimeString(i18n.resolvedLanguage, { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="exp-layout">

      <aside className={`exp-sidebar ${sidebarCollapsed ? "exp-sidebar--collapsed" : ""}`}>
        <button
          type="button"
          className="sidebar-collapse-button exp-sidebar-collapse-button"
          onClick={() => setSidebarCollapsed((current) => {
            const next = !current;
            localStorage.setItem("sidebar-collapsed", String(next));
            return next;
          })}
          aria-label={sidebarCollapsed ? t('navigation.expandSidebar') : t('navigation.collapseSidebar')}
          title={sidebarCollapsed ? t('navigation.expandSidebar') : t('navigation.collapseSidebar')}
        >
          <span className="material-symbols-outlined">{sidebarCollapsed ? "chevron_right" : "chevron_left"}</span>
        </button>
        <div className="exp-sidebar-logo" onClick={() => navigate('/dashboard')}>
          <img src={logo} alt="Logo" className="exp-sidebar-logo-mark" />
          <img src={logoName} alt="PlantStalker" className="exp-sidebar-logo-text" />
        </div>

        <div className="exp-sidebar-meta">
          <p className="exp-sidebar-exp-name">{experiment.name}</p>
          <p className="exp-sidebar-exp-sub">
            {experiment.plant_name && <span>{experiment.plant_name}</span>}
            {experiment.is_public
              ? <span className="exp-sidebar-badge exp-sidebar-badge--public">{t('experimentForm.public')}</span>
              : <span className="exp-sidebar-badge exp-sidebar-badge--private">{t('experimentForm.private')}</span>
            }
          </p>
        </div>

        <p className="exp-sidebar-section-label">{t('experimentForm.controls')}</p>

        <nav className="exp-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`exp-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="exp-nav-item-label">{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>
      </aside>

     
      <div className="exp-main">
       
        <TopBar experimentName={experiment.name} />

       
        <div className="exp-content">

         
          {activeTab === 'overview' && (
            <div className="exp-tab-overview">
              <div className="exp-tab-header">
                <h1 className="exp-tab-title">{experiment.name}</h1>
                <div className="exp-tab-actions">
                  <button className="exp-icon-btn" onClick={() => navigate(`/experiment/${id}/edit`)} title={t('editExperiment.edit')}>
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button className="exp-icon-btn exp-icon-btn--danger" onClick={handleDeleteExperiment} title={t('experimentDetails.delete')}>
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
                <span className="exp-status-label">{experiment.is_public ? t('experimentForm.public') : t('experimentForm.private')}</span>
              </div>

              {/* Info card: Plant type, Description, Collaborators */}
              <div className="exp-overview-card">
                <div className="exp-overview-field">
                  <span className="exp-info-label">{t('experimentForm.plant')}</span>
                  <span>{experiment.plant_name || "-"}</span>
                </div>
                <div className="exp-overview-field">
                  <span className="exp-info-label">{t('experimentForm.description')}</span>
                  <p className="exp-info-desc" style={{ margin: 0 }}>{experiment.description || "-"}</p>
                </div>
                <div className="exp-overview-field">
                  <span className="exp-info-label">{t('experimentForm.keywords')}</span>
                  <div className="exp-details-keywords">
                    {experiment.keywords?.length > 0 ? (
                      experiment.keywords.map((keyword, i) => (
                        <span key={i} className="exp-keyword">{keyword}</span>
                      ))
                    ) : (
                      <span className="exp-no-keywords">{t('experimentDetails.noKeywords')}</span>
                    )}
                  </div>
                </div>
                <div className="exp-overview-field exp-overview-field--last">
                  <span className="exp-info-label">{t('experimentDetails.collaborators')}</span>
                  <div className="exp-collaborators">
                    {experiment.collaborators?.length > 0
                      ? experiment.collaborators.map((c, i) => <span key={i} className="collab-chip">{c}</span>)
                      : <span style={{ color: '#888', fontSize: '14px' }}>{t('experimentDetails.none')}</span>
                    }
                  </div>
                </div>
              </div>

              {design?.pots?.length > 0 && (
                <div className="exp-overview-card experiment-layout-card">
                  <div className="exp-overview-field exp-overview-field--last">
                    <span className="exp-info-label">{t('experimentDetails.layout')}</span>
                    <p className="exp-info-desc">
                      {t('newExperiment.summaryCounts', { factors: design.factors.length, combinations: design.treatments.length, pots: design.pots.length })}
                    </p>
                    <div className="pot-grid">
                      {design.pots.map((pot) => (
                        <div className={`pot-card ${pot.is_monitored ? "monitored" : ""}`} key={pot.id}>
                          <strong>{pot.label}</strong>
                          <small>{t('newExperiment.replicate', { number: pot.replicate_number })}</small>
                          {pot.treatment_levels.map((item) => (
                            <span key={item.factor}>{item.factor}: {item.level}</span>
                          ))}
                          <small>{pot.is_monitored ? t('newExperiment.monitored') : t('experimentDetails.manual')}</small>
                          {pot.hardware_assignments.map((item) => (
                            <small key={item.id}>{item.component_type}: {item.component_identifier}</small>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Dates card */}
              <div className="exp-overview-card exp-overview-card--dates">
                <div className="exp-dates-row">
                  <div className="exp-date-field">
                    <span className="exp-info-label">{t('experimentForm.startDate')}</span>
                    <span>{formatDate(experiment.started_at)}</span>
                  </div>
                  <div className="exp-date-field">
                    <span className="exp-info-label">{t('experimentForm.plannedEndDate')}</span>
                    <span>{formatDate(experiment.planned_end_at)}</span>
                  </div>
                  <div className="exp-date-field">
                    <span className="exp-info-label">{t('experimentDetails.endDate')}</span>
                    <span>{formatDate(experiment.finished_at)}</span>
                  </div>
                </div>
                {experiment.started_at && !experiment.finished_at && (
                  <button className="end-experiment-btn--new" onClick={handleEndExperiment}>
                    <span className="material-symbols-outlined">check</span>
                    {t('experimentDetails.endExperiment')}
                  </button>
                )}
              </div>

              {/* Experiment Alerts */}
              <div className="exp-alerts-section">
                <div className="exp-alerts-header">
                  <div className="exp-alerts-title-row">
                    <span className="exp-alerts-title">{t('experimentDetails.alerts')}</span>
                    {errors.measurements && <span className="exp-alerts-badge">{t('experimentDetails.oneCritical')}</span>}
                  </div>
                  <span className="exp-alerts-view-all">{t('experimentDetails.viewNotifications')}</span>
                </div>

                {errors.measurements ? (
                  <div className="exp-alert-item">
                    <div className="exp-alert-icon exp-alert-icon--critical">
                      <span className="material-symbols-outlined">error</span>
                    </div>
                    <div className="exp-alert-content">
                      <span className="exp-alert-name">{t('experimentDetails.measurementFailed')}</span>
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
                      <span className="exp-alert-name">{t('experimentDetails.systemsNormal')}</span>
                      <span className="exp-alert-desc">{t('experimentDetails.sensorsNormal')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sensor readings */}
              <div className="exp-sensors-section">
                <div className="exp-sensors-header">
                  <div>
                    <span className="exp-sensors-title">{t('experimentDetails.liveSensors')}</span>
                    <div className="pot-selector">
                      <label htmlFor="live-pot-select">{t('experimentDetails.pot')}</label>
                      <select id="live-pot-select" value={selectedPot ?? ""} onChange={(e) => setSelectedPot(Number(e.target.value))}>
                        {potNumbers.map((number) => <option key={number} value={number}>P{number}</option>)}
                      </select>
                    </div>
                  </div>
                  <span className="exp-sensors-time">{t('experimentDetails.updated', { date: nowDateTime })}</span>
                </div>
                <div className="exp-sensors-grid">
                  {[
                    { icon: 'device_thermostat', label: t('experimentDetails.tempInside'), value: latestShared?.air_temperature, unit: '°C' },
                    { icon: 'water_drop', label: t('experimentForm.sensors.soilMoisture'), value: latest?.moisture_percent, unit: '%' },
                    { icon: 'cloud', label: t('experimentForm.sensors.airHumidity'), value: latestShared?.air_humidity, unit: '%' },
                    { icon: 'light_mode', label: t('experimentForm.sensors.light'), value: latestShared?.light_lux, unit: 'lx' },
                    { icon: 'thermostat', label: t('experimentForm.sensors.soilTemperature'), value: latest?.soil_temperature, unit: '°C' },
                    { icon: 'speed', label: t('experimentForm.sensors.pressure'), value: latestShared?.pressure_hpa, unit: 'hPa' },
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
                  <span className="exp-pump-label">{t('experimentDetails.pumpControl')} {selectedPot != null ? `— P${selectedPot}` : ""}</span>
                  <span className={`exp-pump-status ${latest?.pump_on ? 'running' : 'stopped'}`}>
                    {t('experimentDetails.status')}: {latest ? (latest.pump_on ? t('experimentDetails.running') : t('experimentDetails.stopped')) : t('experimentDetails.noData')}
                  </span>
                </div>
                <div className="exp-pump-buttons">
                  {pumpCommands.map(cmd => (
                    <button
                      key={cmd}
                      className={`exp-pump-btn ${selectedPumpCommand === cmd ? 'active' : ''}`}
                      disabled={isSendingPumpCommand || selectedPot == null}
                      onClick={() => sendPumpCommand(cmd)}
                    >{cmd}</button>
                  ))}
                </div>
                <p className="exp-pump-delay-note">
                  {t('experimentDetails.pumpDelay')}
                </p>
                <form
                  className="exp-pump-timer"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const duration = Number(pumpDurationSeconds);
                    if (!Number.isInteger(duration) || duration < 1 || duration > 300) {
                      setPumpCommandStatus(t('experimentDetails.errors.duration'));
                      setPumpCommandHasError(true);
                      return;
                    }
                    sendPumpCommand("ON", duration);
                  }}
                >
                  <label htmlFor="pump-duration">{t('experimentDetails.operationTime')}</label>
                  <input
                    id="pump-duration"
                    type="number"
                    min="1"
                    max="300"
                    step="1"
                    value={pumpDurationSeconds}
                    onChange={(event) => setPumpDurationSeconds(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="exp-pump-btn"
                    disabled={isSendingPumpCommand || selectedPot == null}
                  >{t('experimentDetails.runTimed')}</button>
                </form>
                {pumpCommandStatus && (
                  <p className={
                    pumpCommandHasError ? "pump-command-error" : "pump-command-status"
                  }>
                    {pumpCommandStatus}
                  </p>
                )}
              </div>

              <section className="exp-light-calculator">
                <div className="exp-light-calculator-header">
                  <div>
                    <h3>{t('experimentDetails.lightCalculator')}</h3>
                    <p>{t('experimentDetails.lightCalculatorHelp')}</p>
                  </div>
                  <label>
                    {t('experimentDetails.illuminance')}
                    <span><input type="number" min="0" step="0.01" value={calculatorLuxValue} onChange={(event) => setLightCalculatorLux(event.target.value)} /> lx</span>
                  </label>
                </div>
                <div className="exp-light-results">
                  <div><span>{t('experimentDetails.daylight')}</span><strong>{hasCalculatorLux ? (calculatorLux * DAYLIGHT_PPFD_FACTOR).toFixed(2) : "-"}</strong><small>µmol/m²/s (CF: {DAYLIGHT_PPFD_FACTOR})</small></div>
                  <div><span>EKO-LED SOWELO-690-25-70D-CC-3535</span><strong>{hasCalculatorLux ? (calculatorLux * SOWELO_PPFD_FACTOR).toFixed(2) : "-"}</strong><small>µmol/m²/s ({t('experimentDetails.estimatedCf')}: {SOWELO_PPFD_FACTOR.toFixed(4)})</small></div>
                </div>
                <p className="exp-light-method">
                  {t('experimentDetails.lightMethod')}
                </p>
              </section>

            </div>
          )}

          {/* ── CAMERA VIEW ── */}
          {activeTab === 'camera' && (
            <div className="exp-tab-camera">
              <h2 className="exp-tab-section-title">{t('experimentForm.camera')}</h2>
              <div className="pot-selector pot-selector--section">
                <label htmlFor="camera-pot-select">{t('experimentDetails.pot')}</label>
                <select
                  id="camera-pot-select"
                  value={selectedCameraPot ?? ""}
                  disabled={!cameraPotNumbers.length}
                  onChange={(e) => setSelectedCameraPot(Number(e.target.value))}
                >
                  {!cameraPotNumbers.length && <option value="">{t('experimentDetails.noCameraAssigned')}</option>}
                  {cameraPotNumbers.map((number) => <option key={number} value={number}>P{number}</option>)}
                </select>
              </div>
              <div className="exp-camera-main">
                <div className="exp-camera-frame-wrap">
                  {selectedCameraPot != null && (
                    <img
                      key={selectedCameraPot}
                      src={`${API_BASE_URL}/experiments/${id}/frames/latest/image/?pot_number=${selectedCameraPot}`}
                      alt={t('experimentDetails.latestFrameAlt', { pot: selectedCameraPot })}
                      className="exp-camera-stream"
                      onLoad={e => {
                        e.target.style.display = '';
                        e.target.nextElementSibling?.classList.remove('exp-camera-placeholder-visible');
                      }}
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling?.classList.add('exp-camera-placeholder-visible');
                      }}
                    />
                  )}
                  <div className={`exp-camera-placeholder ${selectedCameraPot == null ? 'exp-camera-placeholder-visible' : ''}`}>
                    <span className="material-symbols-outlined">photo_camera</span>
                    <span>{t('experimentDetails.noCameraFeed')}</span>
                  </div>
                </div>
                <div className="exp-camera-controls">
                  <button className="saved-frames-btn" onClick={() => navigate(`/experiment/${id}/frames`)}>
                    <span className="material-symbols-outlined">photo_library</span>
                    {t('experimentDetails.savedFrames')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' && (
            <div className="exp-tab-analytics">
              <h2 className="exp-tab-section-title">{t('experimentForm.analytics')}</h2>
              <div className="pot-selector pot-selector--section">
                <label htmlFor="analytics-pot-select">{t('experimentDetails.pot')}</label>
                <select id="analytics-pot-select" value={selectedPot ?? ""} onChange={(e) => setSelectedPot(Number(e.target.value))}>
                  {potNumbers.map((number) => <option key={number} value={number}>P{number}</option>)}
                </select>
              </div>
              <ExperimentChart measurements={stationMeasurements} selectedPot={selectedPot} />
              <PotComparisonChart measurements={stationMeasurements} potNumbers={potNumbers} />
            </div>
          )}

          {/* ── HISTORICAL DATA ── */}
          {activeTab === 'history' && (
            <div className="exp-tab-history">
              <div className="exp-tab-header">
                <div>
                  <h2 className="exp-tab-title">{t('experimentForm.history')}</h2>
                  <div className="pot-selector">
                    <label htmlFor="history-pot-select">{t('experimentDetails.pot')}</label>
                    <select id="history-pot-select" value={selectedPot ?? ""} onChange={(e) => setSelectedPot(Number(e.target.value))}>
                      {potNumbers.map((number) => <option key={number} value={number}>P{number}</option>)}
                    </select>
                  </div>
                </div>
                <div className="export-dropdown">
                  <button className="export-btn" onClick={() => setExportOpen(!exportOpen)}>
                    <span className="material-symbols-outlined">download</span>
                    {t('experimentDetails.export')}
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

              {selectedMeasurements.length === 0 ? (
                <div className="exp-empty-state">
                  <span className="material-symbols-outlined">table_rows</span>
                  <p>{t('experimentDetails.noMeasurements')}</p>
                </div>
              ) : (
                <div className="exp-history-table-wrap">
                  <table className="exp-history-table">
                    <thead>
                      <tr>
                        <th>{t('experimentDetails.dateTime')}</th>
                        <th>{t('experimentDetails.airTemp')} (°C)</th>
                        <th>{t('experimentForm.sensors.soilMoisture')} (%)</th>
                        <th>{t('experimentForm.sensors.airHumidity')} (%)</th>
                        <th>{t('experimentDetails.light')} (lx)</th>
                        <th>{t('experimentDetails.soilTemp')} (°C)</th>
                        <th>{t('experimentForm.sensors.pressure')} (hPa)</th>
                        <th>{t('experimentDetails.pump')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMeasurements.map((m, i) => (
                        <tr key={i}>
                          <td>{m.created_at ? new Date(m.created_at).toLocaleString(i18n.resolvedLanguage) : '-'}</td>
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
                  <button className="note-back-btn" onClick={closeNote}>
                    <span className="material-symbols-outlined">arrow_back</span>
                    {t('experimentDetails.timeline')}
                  </button>

                  <div className="note-detail-card">
                    <span className="note-date">
                      {new Date(openNote.created_at || openNote.createdAt).toLocaleString(i18n.resolvedLanguage, {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                      {openNote.updated_at && openNote.updated_at !== openNote.created_at && (
                        <span className="note-edited-tag"> · {t('experimentDetails.edited')}</span>
                      )}
                    </span>

                    {noteEditMode ? (
                      <>
                        <input
                          className="note-input"
                          type="text"
                          placeholder={t('experimentDetails.noteTitle')}
                          value={noteEditDraft.title}
                          onChange={e => setNoteEditDraft(prev => ({ ...prev, title: e.target.value }))}
                        />
                        <textarea
                          className="note-textarea"
                          placeholder={t('experimentDetails.notePlaceholder')}
                          value={noteEditDraft.content}
                          onChange={e => setNoteEditDraft(prev => ({ ...prev, content: e.target.value }))}
                        />
                      </>
                    ) : (
                      <>
                        <h2 className="note-detail-title">{openNote.title}</h2>
                        {openNote.content && <p className="note-detail-content">{openNote.content}</p>}
                      </>
                    )}

                    {(openNote.images?.length > 0) && (
                      <div className="note-image-gallery">
                        {openNote.images.map(img => (
                          <div key={img.id} className="note-gallery-item">
                            <img
                              src={img.image_url}
                              alt={t('experimentDetails.noteAttachment')}
                              onClick={() => setLightboxUrl(img.image_url)}
                              title={t('experimentDetails.enlarge')}
                            />
                            <button
                              className="note-image-remove"
                              disabled={noteBusy}
                              title={t('experimentDetails.removeImage')}
                              onClick={() => handleDeleteNoteImage(img.id)}
                            >
                              <span className="material-symbols-outlined">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="note-detail-actions">
                      {noteEditMode ? (
                        <>
                          <label className="note-image-upload">
                            <span className="material-symbols-outlined">add_photo_alternate</span>
                            {t('experimentDetails.addImages')}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              style={{ display: 'none' }}
                              disabled={noteBusy}
                              onChange={e => { handleAddNoteImages(e.target.files); e.target.value = ''; }}
                            />
                          </label>
                          <div className="note-detail-actions-right">
                            <button className="note-cancel-btn" disabled={noteBusy} onClick={() => setNoteEditMode(false)}>
                              {t('experimentForm.cancel')}
                            </button>
                            <button
                              className="note-save-btn"
                              disabled={noteBusy || !noteEditDraft.title.trim()}
                              onClick={handleSaveNoteEdit}
                            >
                              {t('editExperiment.save')}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <button
                            className="note-edit-inline-btn"
                            onClick={() => {
                              setNoteEditDraft({ title: openNote.title, content: openNote.content || '' });
                              setNoteEditMode(true);
                            }}
                          >
                            <span className="material-symbols-outlined">edit</span>
                            {t('experimentDetails.editNote')}
                          </button>
                          <button className="note-delete-inline-btn" disabled={noteBusy} onClick={handleDeleteNote}>
                            <span className="material-symbols-outlined">delete</span>
                            {t('experimentDetails.deleteNote')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {lightboxUrl && (
                    <div className="note-lightbox" onClick={() => setLightboxUrl(null)}>
                      <img src={lightboxUrl} alt={t('experimentDetails.fullSize')} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="notes-header">
                    <button className="notes-new-btn" onClick={() => setNoteFormOpen(true)}>
                      <span className="material-symbols-outlined">add</span>
                      {t('experimentDetails.newNote')}
                    </button>
                  </div>

                  <div className="notes-timeline-header">
                    <span className="notes-timeline-title">{t('experimentDetails.timeline')}</span>
                  </div>

                  <div className="notes-list">
                    {notes.length === 0 ? (
                      <div className="notes-empty">
                        <span className="material-symbols-outlined">edit_note</span>
                        <p>{t('experimentDetails.noNotes')}</p>
                      </div>
                    ) : (
                      notes.map(note => (
                        <div key={note.id} className="note-card" onClick={() => setOpenNote(note)}>
                          <div className="note-card-main">
                            <span className="note-date">
                              {new Date(note.created_at || note.createdAt).toLocaleString(i18n.resolvedLanguage, {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            <h3 className="note-title">{note.title}</h3>
                            {note.content && <p className="note-content">{note.content}</p>}
                          </div>
                          {note.images?.length > 0 && (
                            <div className="note-thumb-wrap">
                              <img src={note.images[0].image_url} alt={t('experimentDetails.noteAttachment')} className="note-image" />
                              {note.images.length > 1 && (
                                <span className="note-thumb-count">+{note.images.length - 1}</span>
                              )}
                            </div>
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
                    <h3 className="note-modal-title">{t('experimentDetails.newObservation')}</h3>
                    <input
                      className="note-input"
                      type="text"
                      placeholder={t('experimentDetails.noteTitle')}
                      value={draftNote.title}
                      onChange={e => setDraftNote(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <textarea
                      className="note-textarea"
                      placeholder={t('experimentDetails.notePlaceholder')}
                      value={draftNote.content}
                      onChange={e => setDraftNote(prev => ({ ...prev, content: e.target.value }))}
                    />
                    <label className="note-image-upload">
                      <span className="material-symbols-outlined">add_photo_alternate</span>
                      {t('experimentDetails.addImages')}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) setDraftNote(prev => ({
                            ...prev,
                            images: [...prev.images, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))],
                          }));
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {draftNote.images.length > 0 && (
                      <div className="note-image-gallery">
                        {draftNote.images.map((img, idx) => (
                          <div key={idx} className="note-gallery-item">
                            <img src={img.url} alt={t('experimentDetails.preview')} />
                            <button
                              className="note-image-remove"
                              title={t('experimentDetails.removeImage')}
                              onClick={() => setDraftNote(prev => ({
                                ...prev,
                                images: prev.images.filter((_, i) => i !== idx),
                              }))}
                            >
                              <span className="material-symbols-outlined">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="note-modal-actions">
                      <button className="note-cancel-btn" onClick={() => {
                        setNoteFormOpen(false);
                        setDraftNote({ title: '', content: '', images: [] });
                      }}>{t('experimentForm.cancel')}</button>
                      <button
                        className="note-save-btn"
                        disabled={noteBusy || !draftNote.title.trim()}
                        onClick={async () => {
                          setNoteBusy(true);
                          const formData = new FormData();
                          formData.append('title', draftNote.title);
                          formData.append('content', draftNote.content);
                          draftNote.images.forEach(img => formData.append('images', img.file));
                          try {
                            const res = await fetch(`${API_BASE_URL}/experiments/${id}/notes/`, {
                              method: 'POST',
                              headers: getAuthTokenHeader(),
                              body: formData,
                            });
                            if (res.ok) {
                              const saved = await res.json();
                              setNotes(prev => [saved, ...prev]);
                              setNoteFormOpen(false);
                              setDraftNote({ title: '', content: '', images: [] });
                            } else {
                              const errBody = await res.json().catch(() => ({}));
                              console.error('Note save error:', res.status, errBody);
                              toast.error(t('experimentDetails.errors.saveNote', { status: res.status }));
                            }
                          } catch {
                            toast.error(t('experimentForm.errors.connection'));
                          }
                          setNoteBusy(false);
                        }}
                      >{t('experimentDetails.saveNote')}</button>
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
            <h3>{t('experimentDetails.selectSensors')}</h3>
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
              <button className="export-cancel-btn" onClick={() => setExportModalOpen(false)}>{t('experimentForm.cancel')}</button>
              <button className="export-download-btn" onClick={handleDownload}>{t('experimentDetails.download')} {exportFormat.toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Experiment_details;

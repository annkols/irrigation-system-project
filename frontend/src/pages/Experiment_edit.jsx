import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from "react-toastify";
import "../App.css";
import logo from "./images/logo-color.png";
import logoName from "./images/name-color.png";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};
const parseHours = (value) => Number(String(value).trim().replace(",", "."));
const hoursToSeconds = (value) => Math.max(1, Math.round(parseHours(value) * 3600));
const secondsToHours = (value) => {
  const hours = Number(value || 3600) / 3600;
  return String(Number(hours.toFixed(4))).replace(".", ",");
};

const SENSORS = [
  { key: 'air_temperature', label: 'air temperature (shared)' },
  { key: 'air_humidity', label: 'air humidity (shared)' },
  { key: 'pressure', label: 'pressure (shared)' },
  { key: 'light', label: 'light intensity (shared)' },
  { key: 'soil_moisture', label: 'soil moisture (per pot)' },
  { key: 'soil_temperature', label: 'soil temperature (per pot)' },
];

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: 'dashboard' },
  { key: 'camera', label: 'Camera view', icon: 'videocam' },
  { key: 'analytics', label: 'Analytics', icon: 'bar_chart' },
  { key: 'notes', label: 'Notes', icon: 'edit_note' },
  { key: 'history', label: 'Historical data', icon: 'table_rows' },
];

function Experiment_edit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [experimentName, setExperimentName] = useState("");
  const [name, setName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [errors, setErrors] = useState({});
  const [frequencies, setFrequencies] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );

  useEffect(() => {
    fetch(`${API_BASE_URL}/experiments/${id}/`, {
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch experiment data");
        return res.json();
      })
      .then((data) => {
        setExperimentName(data.name || "");
        setName(data.name || "");
        setPlantName(data.plant_name || "");
        setDescription(data.description || "");
        setIsPublic(data.is_public || false);
        setKeywords(data.keywords || []);

        if (data.started_at) setStartDate(data.started_at.split('T')[0]);
        if (data.planned_end_at) setEndDate(data.planned_end_at.split('T')[0]);

        setSelectedSetup(data.sensor_set_id);

        const fallbackFrequency = data.measurement_frequency_seconds || 3600;
        setFrequencies(Object.fromEntries(SENSORS.map((sensor) => [
          sensor.key,
          secondsToHours(data.sensor_frequencies?.[sensor.key] || fallbackFrequency),
        ])));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error loading experiment details.");
        navigate('/dashboard');
      });
  }, [id, navigate]);

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (indexToRemove) => {
    setKeywords(keywords.filter((_, index) => index !== indexToRemove));
  };

  const handleFreqChange = (sensor, value) => {
    setFrequencies(prev => ({ ...prev, [sensor]: value }));
  };

  const handleSave = () => {
    setErrors({});
    const localErrors = {};

    if (!name.trim()) {
      localErrors.name = ["This field is required."];
    } else if (name.length > 100) {
      localErrors.name = ["Ensure the name has no more than 100 characters."];
    }

    if (!plantName.trim()) {
      localErrors.plant_name = ["This field is required."];
    } else if (plantName.length > 100) {
      localErrors.plant_name = ["Ensure the plant type has no more than 100 characters."];
    }

    if (description.length > 2000) {
      localErrors.description = ["Ensure the description has no more than 2000 characters."];
    }

    if (!keywords || keywords.length === 0) {
      localErrors.keywords = ["At least one keyword is required."];
    } else if (keywords.length > 15) {
      localErrors.keywords = ["Ensure there are no more than 15 keywords."];
    } else if (keywords.some(kw => kw.length > 50)) {
      localErrors.keywords = ["Ensure each keyword has no more than 50 characters."];
    }

    if (!selectedSetup) {
      localErrors.sensor_set_id = ["Hardware set ID is missing."];
    } else {
      const invalidSensors = SENSORS.some(sensor => {
        const val = frequencies[sensor.key];
        const numVal = parseHours(val);
        const isEmpty = !val || val.trim() === "";
        const isNotNumber = !Number.isFinite(numVal);
        const isOutOfRange = numVal <= 0;
        return isEmpty || isNotNumber || isOutOfRange;
      });
      if (invalidSensors) {
        localErrors.sensor_set_id = ["Frequencies must be positive numbers of hours, for example 1 or 0,3."];
      }
    }

    if (!startDate) {
      localErrors.started_at = ["Start date is required."];
    }

    if (!endDate) {
      localErrors.planned_end_at = ["Planned end date is required."];
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
      localErrors.planned_end_at = ["Planned end date cannot be earlier than start date."];
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    const sensorFrequencies = Object.fromEntries(
      SENSORS.map(sensor => [sensor.key, hoursToSeconds(frequencies[sensor.key])])
    );

    const updatedExperiment = {
      name,
      description,
      plant_name: plantName,
      keywords,
      measurement_frequency_seconds: Math.min(...Object.values(sensorFrequencies)),
      sensor_frequencies: sensorFrequencies,
      started_at: startDate || null,
      planned_end_at: endDate || null,
      is_public: isPublic,
    };

    setIsSaving(true);
    fetch(`${API_BASE_URL}/experiments/${id}/edit/`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedExperiment),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          navigate(`/experiment/${id}`, {
            state: { message: "Experiment updated successfully!" },
          });
        } else {
          setErrors(data);
          toast.error("Please fix the highlighted fields.");
        }
      })
      .catch((err) => {
        console.error("Error updating experiment:", err);
        toast.error("Server connection error.");
      })
      .finally(() => setIsSaving(false));
  };

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
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined">{sidebarCollapsed ? "chevron_right" : "chevron_left"}</span>
        </button>
        <div className="exp-sidebar-logo" onClick={() => navigate('/dashboard')}>
          <img src={logo} alt="Logo" className="exp-sidebar-logo-mark" />
          <img src={logoName} alt="PlantStalker" className="exp-sidebar-logo-text" />
        </div>

        <div className="exp-sidebar-meta">
          <p className="exp-sidebar-exp-name">{experimentName || "Experiment"}</p>
          <p className="exp-sidebar-exp-sub">
            {plantName && <span>{plantName}</span>}
            {isPublic
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
              className="exp-nav-item"
              onClick={() => navigate(`/experiment/${id}`)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="exp-nav-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="exp-main">
        <div className="exp-topbar">
          <div className="exp-breadcrumb">
            <span className="exp-breadcrumb-link" onClick={() => navigate('/dashboard')}>Dashboard</span>
            <span className="exp-breadcrumb-sep">›</span>
            <span className="exp-breadcrumb-link" onClick={() => navigate(`/experiment/${id}`)}>
              {experimentName || "Experiment"}
            </span>
            <span className="exp-breadcrumb-sep">›</span>
            <span>Edit</span>
          </div>
          <div className="exp-topbar-actions">
            <span className="material-symbols-outlined exp-topbar-icon">notifications</span>
            <span className="material-symbols-outlined exp-topbar-icon">settings</span>
            <span className="material-symbols-outlined exp-topbar-icon">account_circle</span>
          </div>
        </div>

        <div className="exp-content">
          {isLoading ? (
            <div className="exp-tab-overview"><p>Loading experiment data...</p></div>
          ) : (
            <div className="exp-tab-overview exp-edit">
              <div className="exp-tab-header">
                <h1 className="exp-tab-title">Edit experiment</h1>
                <div className="exp-tab-actions">
                  <button
                    className="exp-btn exp-btn--ghost"
                    onClick={() => navigate(`/experiment/${id}`)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button className="exp-btn exp-btn--primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>

              <div className="exp-overview-card">
                <div className="exp-overview-field">
                  <label className="exp-info-label" htmlFor="exp-name">Experiment name</label>
                  <input
                    id="exp-name"
                    className={`exp-edit-input ${errors.name ? "exp-edit-input--error" : ""}`}
                    type="text"
                    placeholder="Name your experiment"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {errors.name && <span className="error-text">{errors.name[0]}</span>}
                </div>

                <div className="exp-overview-field">
                  <label className="exp-info-label" htmlFor="exp-plant">Plant type</label>
                  <input
                    id="exp-plant"
                    className={`exp-edit-input ${errors.plant_name ? "exp-edit-input--error" : ""}`}
                    type="text"
                    placeholder="Type in type of plant"
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                  />
                  {errors.plant_name && <span className="error-text">{errors.plant_name[0]}</span>}
                </div>

                <div className="exp-overview-field exp-overview-field--last">
                  <label className="exp-info-label" htmlFor="exp-desc">Description</label>
                  <textarea
                    id="exp-desc"
                    className={`exp-edit-input exp-edit-textarea ${errors.description ? "exp-edit-input--error" : ""}`}
                    placeholder="Describe your experiment (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  {errors.description && <span className="error-text">{errors.description[0]}</span>}
                </div>
              </div>

              <div className="exp-overview-card">
                <div className="exp-overview-field">
                  <span className="exp-info-label">Keywords</span>
                  <div className="exp-edit-keyword-row">
                    <input
                      className={`exp-edit-input ${errors.keywords ? "exp-edit-input--error" : ""}`}
                      type="text"
                      placeholder="Add a keyword"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                    />
                    <button type="button" className="exp-btn exp-btn--primary" onClick={handleAddKeyword}>
                      Add
                    </button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="exp-details-keywords">
                      {keywords.map((kw, index) => (
                        <span key={index} className="exp-keyword">
                          {kw}
                          <button
                            type="button"
                            className="btn-remove-tag"
                            onClick={() => handleRemoveKeyword(index)}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {errors.keywords && <span className="error-text">{errors.keywords[0]}</span>}
                </div>

                <div className="exp-overview-field exp-overview-field--last">
                  <div className="exp-edit-row">
                    <div className="exp-edit-col">
                      <label className="exp-info-label" htmlFor="start_date">Start date</label>
                      <input
                        className={`exp-edit-input ${errors.started_at ? "exp-edit-input--error" : ""}`}
                        type="date"
                        id="start_date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                      {errors.started_at && <span className="error-text">{errors.started_at[0]}</span>}
                    </div>
                    <div className="exp-edit-col">
                      <label className="exp-info-label" htmlFor="end_date">Planned end date</label>
                      <input
                        className={`exp-edit-input ${errors.planned_end_at ? "exp-edit-input--error" : ""}`}
                        type="date"
                        id="end_date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                      {errors.planned_end_at && <span className="error-text">{errors.planned_end_at[0]}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exp-overview-card">
                <div className="exp-overview-field exp-overview-field--last">
                  <span className="exp-info-label">
                    Hardware set ID: <strong>{selectedSetup}</strong> · reading frequency (hours)
                  </span>
                  <div className="frequency-grid">
                    {SENSORS.map((sensor) => (
                      <label key={sensor.key}>
                        <span>{sensor.label}</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g. 0,3"
                          className={errors.sensor_set_id && (!frequencies[sensor.key] || parseHours(frequencies[sensor.key]) <= 0) ? "exp-edit-input--error" : ""}
                          value={frequencies[sensor.key] || ""}
                          onKeyDown={(e) => {
                            if (["e", "E"].includes(e.key)) e.preventDefault();
                          }}
                          onChange={(e) => handleFreqChange(sensor.key, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                  {errors.sensor_set_id && <span className="error-text">{errors.sensor_set_id[0]}</span>}
                </div>
              </div>

              <div className="exp-overview-card">
                <div className="exp-overview-field exp-overview-field--last">
                  <label className="exp-edit-checkbox">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    <span>Make my experiment public and let other users see the data.</span>
                  </label>
                </div>
              </div>

              <div className="exp-edit-footer">
                <button
                  className="exp-btn exp-btn--ghost"
                  onClick={() => navigate(`/experiment/${id}`)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button className="exp-btn exp-btn--primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Experiment_edit;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import LocalizedDateInput from "./LocalizedDateInput";
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
  { key: 'air_temperature', labelKey: 'airTemperature', scopeKey: 'shared' },
  { key: 'air_humidity', labelKey: 'airHumidity', scopeKey: 'shared' },
  { key: 'pressure', labelKey: 'pressure', scopeKey: 'shared' },
  { key: 'light', labelKey: 'light', scopeKey: 'shared' },
  { key: 'soil_moisture', labelKey: 'soilMoisture', scopeKey: 'perPot' },
  { key: 'soil_temperature', labelKey: 'soilTemperature', scopeKey: 'perPot' },
];

const NAV_ITEMS = [
  { key: 'overview', icon: 'dashboard' },
  { key: 'camera', icon: 'videocam' },
  { key: 'analytics', icon: 'bar_chart' },
  { key: 'notes', icon: 'edit_note' },
  { key: 'history', icon: 'table_rows' },
];

function Experiment_edit() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
        if (res.status === 403) {
          toast.error(t("experimentForm.errors.permission"));
          navigate(`/experiment/${id}`);
          throw new Error("Forbidden");
        }
        if (!res.ok) throw new Error(t("experimentForm.errors.load"));
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
        toast.error(t("experimentForm.errors.load"));
        navigate('/dashboard');
      });
  }, [id, navigate, t]);

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
      localErrors.name = [t("experimentForm.errors.required")];
    } else if (name.length > 100) {
      localErrors.name = [t("experimentForm.errors.nameLength")];
    }

    if (!plantName.trim()) {
      localErrors.plant_name = [t("experimentForm.errors.required")];
    } else if (plantName.length > 100) {
      localErrors.plant_name = [t("experimentForm.errors.plantLength")];
    }

    if (description.length > 2000) {
      localErrors.description = [t("experimentForm.errors.descriptionLength")];
    }

    if (!keywords || keywords.length === 0) {
      localErrors.keywords = [t("experimentForm.errors.keywordRequired")];
    } else if (keywords.length > 15) {
      localErrors.keywords = [t("experimentForm.errors.keywordCount")];
    } else if (keywords.some(kw => kw.length > 50)) {
      localErrors.keywords = [t("experimentForm.errors.keywordLength")];
    }

    if (!selectedSetup) {
      localErrors.sensor_set_id = [t("experimentForm.errors.hardwareMissing")];
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
        localErrors.sensor_set_id = [t("experimentForm.errors.frequency")];
      }
    }

    if (!startDate) {
      localErrors.started_at = [t("experimentForm.errors.startRequired")];
    }

    if (!endDate) {
      localErrors.planned_end_at = [t("experimentForm.errors.endRequired")];
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
      localErrors.planned_end_at = [t("experimentForm.errors.endBeforeStart")];
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

        if (res.status === 403) {
          toast.error(t("experimentForm.errors.permission"));
          navigate(`/experiment/${id}`);
          return;
        }

        if (res.ok) {
          navigate(`/experiment/${id}`, {
            state: { message: t("editExperiment.updated") },
          });
        } else {
          setErrors(data);
          toast.error(t("editExperiment.fixFields"));
        }
      })
      .catch((err) => {
        console.error("Error updating experiment:", err);
        toast.error(t("experimentForm.errors.connection"));
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
          aria-label={sidebarCollapsed ? t("navigation.expandSidebar") : t("navigation.collapseSidebar")}
          title={sidebarCollapsed ? t("navigation.expandSidebar") : t("navigation.collapseSidebar")}
        >
          <span className="material-symbols-outlined">{sidebarCollapsed ? "chevron_right" : "chevron_left"}</span>
        </button>
        <div
          className="exp-sidebar-logo"
          onClick={() => navigate('/dashboard')}
          data-sidebar-tooltip={t("navigation.dashboard")}
          tabIndex={0}
          role="button"
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") navigate('/dashboard');
          }}
        >
          <img src={logo} alt="Logo" className="exp-sidebar-logo-mark" />
          <img src={logoName} alt="PlantStalker" className="exp-sidebar-logo-text" />
        </div>

        <div className="exp-sidebar-meta">
          <p className="exp-sidebar-exp-name">{experimentName || t("experimentForm.experiment")}</p>
          <p className="exp-sidebar-exp-sub">
            {plantName && <span>{plantName}</span>}
            {isPublic
              ? <span className="exp-sidebar-badge exp-sidebar-badge--public">{t("experimentForm.public")}</span>
              : <span className="exp-sidebar-badge exp-sidebar-badge--private">{t("experimentForm.private")}</span>
            }
          </p>
        </div>

        <p className="exp-sidebar-section-label">{t("experimentForm.controls")}</p>

        <nav className="exp-sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className="exp-nav-item"
              onClick={() => navigate(`/experiment/${id}`)}
              data-sidebar-tooltip={t(`experimentForm.${item.key}`)}
              aria-label={t(`experimentForm.${item.key}`)}
              title={t(`experimentForm.${item.key}`)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="exp-nav-item-label">{t(`experimentForm.${item.key}`)}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="exp-main">
        <div className="exp-topbar">
          <div className="exp-breadcrumb">
            <span className="exp-breadcrumb-link" onClick={() => navigate('/dashboard')}>{t("navigation.dashboard")}</span>
            <span className="exp-breadcrumb-sep">›</span>
            <span className="exp-breadcrumb-link" onClick={() => navigate(`/experiment/${id}`)}>
              {experimentName || t("experimentForm.experiment")}
            </span>
            <span className="exp-breadcrumb-sep">›</span>
            <span>{t("editExperiment.edit")}</span>
          </div>
          <div className="exp-topbar-actions">
            <span className="material-symbols-outlined exp-topbar-icon">notifications</span>
            <span className="material-symbols-outlined exp-topbar-icon">settings</span>
            <span className="material-symbols-outlined exp-topbar-icon">account_circle</span>
          </div>
        </div>

        <div className="exp-content">
          {isLoading ? (
            <div className="exp-tab-overview"><p>{t("editExperiment.loading")}</p></div>
          ) : (
            <div className="exp-tab-overview exp-edit">
              <div className="exp-tab-header">
                <h1 className="exp-tab-title">{t("editExperiment.title")}</h1>
                <div className="exp-tab-actions">
                  <button
                    className="exp-btn exp-btn--ghost"
                    onClick={() => navigate(`/experiment/${id}`)}
                    disabled={isSaving}
                  >
                    {t("experimentForm.cancel")}
                  </button>
                  <button className="exp-btn exp-btn--primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? t("editExperiment.saving") : t("editExperiment.save")}
                  </button>
                </div>
              </div>

              <div className="exp-overview-card">
                <div className="exp-overview-field">
                  <label className="exp-info-label" htmlFor="exp-name">{t("experimentForm.name")}</label>
                  <input
                    id="exp-name"
                    className={`exp-edit-input ${errors.name ? "exp-edit-input--error" : ""}`}
                    type="text"
                    placeholder={t("editExperiment.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {errors.name && <span className="error-text">{errors.name[0]}</span>}
                </div>

                <div className="exp-overview-field">
                  <label className="exp-info-label" htmlFor="exp-plant">{t("experimentForm.plant")}</label>
                  <input
                    id="exp-plant"
                    className={`exp-edit-input ${errors.plant_name ? "exp-edit-input--error" : ""}`}
                    type="text"
                    placeholder={t("editExperiment.plantPlaceholder")}
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                  />
                  {errors.plant_name && <span className="error-text">{errors.plant_name[0]}</span>}
                </div>

                <div className="exp-overview-field exp-overview-field--last">
                  <label className="exp-info-label" htmlFor="exp-desc">{t("experimentForm.description")}</label>
                  <textarea
                    id="exp-desc"
                    className={`exp-edit-input exp-edit-textarea ${errors.description ? "exp-edit-input--error" : ""}`}
                    placeholder={t("editExperiment.descriptionPlaceholder")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  {errors.description && <span className="error-text">{errors.description[0]}</span>}
                </div>
              </div>

              <div className="exp-overview-card">
                <div className="exp-overview-field">
                  <span className="exp-info-label">{t("experimentForm.keywords")}</span>
                  <div className="exp-edit-keyword-row">
                    <input
                      className={`exp-edit-input ${errors.keywords ? "exp-edit-input--error" : ""}`}
                      type="text"
                      placeholder={t("editExperiment.keywordPlaceholder")}
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
                      {t("experimentForm.add")}
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
                      <label className="exp-info-label" htmlFor="start_date">{t("experimentForm.startDate")}</label>
                      <LocalizedDateInput value={startDate} onChange={setStartDate} ariaLabel={t("experimentForm.startDate")} />
                      {errors.started_at && <span className="error-text">{errors.started_at[0]}</span>}
                    </div>
                    <div className="exp-edit-col">
                      <label className="exp-info-label" htmlFor="end_date">{t("experimentForm.plannedEndDate")}</label>
                      <LocalizedDateInput value={endDate} onChange={setEndDate} ariaLabel={t("experimentForm.plannedEndDate")} />
                      {errors.planned_end_at && <span className="error-text">{errors.planned_end_at[0]}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="exp-overview-card">
                <div className="exp-overview-field exp-overview-field--last">
                  <span className="exp-info-label">
                    {t("experimentForm.hardwareSetId")}: <strong>{selectedSetup}</strong> · {t("experimentForm.readingFrequency")}
                  </span>
                  <div className="frequency-grid">
                    {SENSORS.map((sensor) => (
                      <label key={sensor.key}>
                        <span>{t(`experimentForm.sensors.${sensor.labelKey}`)} ({t(`experimentForm.sensors.${sensor.scopeKey}`)})</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder={t("experimentForm.exampleDecimal")}
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
                    <span>{t("experimentForm.makePublic")}</span>
                  </label>
                </div>
              </div>

              <div className="exp-edit-footer">
                <button
                  className="exp-btn exp-btn--ghost"
                  onClick={() => navigate(`/experiment/${id}`)}
                  disabled={isSaving}
                >
                  {t("experimentForm.cancel")}
                </button>
                <button className="exp-btn exp-btn--primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? t("editExperiment.saving") : t("editExperiment.save")}
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

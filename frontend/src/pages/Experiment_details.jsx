import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import "../App.css";
import logo from "./images/logo_cultiva.svg";
import bgImage from "./images/back.jpg";
import ExperimentChart from "./ExperimentChart";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const getTableConfigs = (experiment) => {
  if (experiment?.table_configs?.length) {
    return experiment.table_configs;
  }

  const tableCount = experiment?.table_count || 1;
  const potCount = experiment?.pots_per_table || 1;
  return Array.from({ length: tableCount }, (_, index) => ({
    table_number: index + 1,
    pot_count: potCount,
  }));
};

const getMaxPotCount = (experiment) => Math.max(
  ...getTableConfigs(experiment).map(config => config.pot_count || 1),
  1
);

const measurementMatchesExperiment = (measurement, experiment) => (
  getTableConfigs(experiment).some(config => (
    measurement.table_number === config.table_number &&
    measurement.pot_number <= config.pot_count
  ))
);

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
  const lastSuccessTimeRef = useRef(null);
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
      .filter(([, checked]) => checked)
      .map(([key]) => key)
      .join(',');
    window.open(
      `${API_BASE_URL}/experiments/${id}/export-csv/?export_format=${exportFormat}&columns=${cols}`,
      '_blank'
    );
    setExportModalOpen(false);
  };

  const now = new Date();
  const nowDate = now.toLocaleDateString("pl-PL");
  const nowTime = now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    if (!experiment) {
      fetch(`${API_BASE_URL}/experiments/${id}/`)
        .then(res => res.json())
        .then(data => setExperiment(data))
        .catch(err => console.error(err));
      return;
    }

    const fetchMeasurements = () => {
      const currentTime = new Date().toLocaleString();
      const params = new URLSearchParams({
        table_number_max: String(experiment.table_count || 1),
        pot_number_max: String(getMaxPotCount(experiment)),
        limit: "500",
      });

      if (experiment.started_at) {
        params.set("date_from", experiment.started_at);
      }

      if (experiment.planned_end_at) {
        params.set("date_to", experiment.planned_end_at);
      }

      fetch(`${API_BASE_URL}/measurements/?${params.toString()}`)
        .then(res => {
          if (!res.ok) throw new Error("Server error");
          return res.json();
        })
        .then(data => {
          // jeśli tablica z pomiarami jest pusta to jest tak jakby błąd pobrania pomiarów
          if (!data || data.length === 0) {
            throw new Error("No measurements available");
          }
          setMeasurements(data);
          lastSuccessTimeRef.current = currentTime;
            setErrors(prevErrors => ({
            ...prevErrors,
            measurements: null
          }));
        })
        .catch(err => {
          console.error(err);       
          const successString = lastSuccessTimeRef.current || "never";
            setErrors(prevErrors => ({
            ...prevErrors,
            measurements: `Failed to fetch measurements at ${currentTime}. Last successful fetch at ${successString}.`
          }));
         });
    };

    fetchMeasurements();
    const interval = setInterval(fetchMeasurements, 10000);
    return () => clearInterval(interval);
  }, [id, experiment]);

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
                  if (!response.ok) {
                    toast.error(data.detail || 'Failed to end the experiment.');
                    return;
                  }
                  toast.success("Experiment has been successfully ended!");
                  setExperiment(data);
                } catch (error) {
                  console.error("Network error:", error);
                  toast.error("Server connection error.");
                }
              }}
              style={{ padding: '4px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Yes
            </button>
            <button
              onClick={closeToast}
              style={{ padding: '4px 12px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { autoClose: false, closeOnClick: false }
    );
  };

  const experimentMeasurements = experiment
    ? measurements.filter((measurement) => measurementMatchesExperiment(measurement, experiment))
    : measurements;
  const latest = experimentMeasurements.length > 0 ? experimentMeasurements[0] : null;

  const calculateProgress = (exp) => {
    if (!exp || !exp.started_at) return 0;
    if (!exp.planned_end_at) return 0;
    const start = new Date(exp.started_at).getTime();
    const end = new Date(exp.planned_end_at).getTime();
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
    } catch {
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
              <span 
                className="material-symbols-outlined" 
                onClick={() => navigate(`/experiment/${id}/edit`)} 
                style={{ cursor: 'pointer' }}
              >
                edit
              </span>
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
        <p className="exp-details-private">
          {experiment.is_public ? "This experiment is public" : "This experiment is private"}
        </p>

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
            <span> {formatDate(experiment.started_at) || "-"} </span>
          </div>
          <div className="exp-details-date-field">
            <label>Planned end date:</label>
            <span>{formatDate(experiment.planned_end_at) || "-"}</span>
          </div>
          <div className="exp-details-date-field">
            <label>End date:</label>
            <span>{formatDate(experiment.finished_at) || "-"}</span>
          </div>
          {/* zakończ eksperyment button, widoczny tylko jeśli można zakończyć */}
          {experiment.started_at && !experiment.finished_at && (
            <button className="end-experiment-btn" onClick={handleEndExperiment}>
              <span className="material-symbols-outlined">check</span>
              <span>END EXPERIMENT</span>
            </button>
          )}
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

        {/* error jeśli nie ma odczytów w czujników */}
        {errors.measurements && (
          <span className="error-text">
            {errors.measurements}
          </span>
        )}

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
              <button onClick={() => handleExportClick('csv')}>CSV</button>
              <button onClick={() => handleExportClick('excel')}>Excel</button>
            </div>
          )}
        </div>

        {/* wykresy */}
        <ExperimentChart sensorPackageVariant={experiment?.sensor_package_variant}/>


      </div>

      {exportModalOpen && (
        <div className="export-modal-overlay" onClick={() => setExportModalOpen(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Select sensors to export</h3>
            <div className="export-checkboxes">
              {Object.entries(columnLabels).map(([key, label]) => (
                <label key={key} className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedColumns[key]}
                    onChange={() => setSelectedColumns(prev => ({
                      ...prev,
                      [key]: !prev[key]
                    }))}
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
    </>
  );
}

export default Experiment_details;



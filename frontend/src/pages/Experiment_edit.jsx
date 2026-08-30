import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from "react-toastify";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const parseHours = (value) => Number(String(value).trim().replace(",", "."));
const hoursToSeconds = (value) => Math.max(1, Math.round(parseHours(value) * 3600));
const secondsToHours = (value) => {
  const hours = Number(value || 3600) / 3600;
  return String(Number(hours.toFixed(4))).replace(".", ",");
};

function Experiment_edit() {
  const navigate = useNavigate();
  const {id} = useParams();
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
  const [isPublic, setIsPublic] = useState(false);

  const sensors = [
    { key: 'air_temperature', label: 'air temperature (shared)' },
    { key: 'air_humidity', label: 'air humidity (shared)' },
    { key: 'pressure', label: 'pressure (shared)' },
    { key: 'light', label: 'light intensity (shared)' },
    { key: 'soil_moisture', label: 'soil moisture (per pot)' },
    { key: 'soil_temperature', label: 'soil temperature (per pot)' },
  ];

    useEffect(() => {
      fetch(`${API_BASE_URL}/experiments/${id}/`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch experiment data");
          return res.json();
        })
        .then((data) => {
          setName(data.name || "");
          setPlantName(data.plant_name || "");
          setDescription(data.description || "");
          setIsPublic(data.is_public || false);
          setKeywords(data.keywords || []);
      
          if (data.started_at) setStartDate(data.started_at.split('T')[0]);
          if (data.planned_end_at) setEndDate(data.planned_end_at.split('T')[0]);
      
          setSelectedSetup(data.sensor_set_id);
      
          const fallbackFrequency = data.measurement_frequency_seconds || 3600;
          setFrequencies(Object.fromEntries(sensors.map((sensor) => [
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
      setFrequencies(prev => ({
        ...prev,
        [sensor]: value
      }));
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
      const invalidSensors = sensors.some(sensor => {
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
      sensors.map(sensor => [
        sensor.key,
        hoursToSeconds(frequencies[sensor.key])
      ])
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
      is_public: isPublic
    };

    console.log("Wysylane dane edycji:", updatedExperiment);

    fetch(`${API_BASE_URL}/experiments/${id}/edit/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedExperiment),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok) {
            navigate(`/experiment/${id}`, { 
              state: { message: "Experiment updated successfully!" } 
            });
          } else {
            setErrors(data);
          }
        })
        .catch((err) => {
          console.error("Error updating experiment:", err);
          toast.error("Server connection error.");
        });
    };

    if (isLoading) {
      return <div className="loading">Loading experiment data...</div>;
    }

  return (
    <div className="dashboard-page">
      <Sidebar />
      <div className="dashboard-content">
        <TopBar />
      <div className="form edit-experiment-form">
        <div className="new-exp-form">
          <h2>Edit experiment</h2>
        </div>

        <div className="form-section">
          <p>Experiment name:</p>
          <input
            className={errors.name ? "input-error" : ""}
            type="text"
            placeholder="Name your experiment"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <span className="error-text">{errors.name[0]}</span>}
        </div>

        <div className="form-section">
          <p>Plant type:</p>
          <input
            type="text"
            placeholder="Type in type of plant"
            value={plantName}
            onChange={(e) => setPlantName(e.target.value)}
          />
          {errors.plant_name && <span className="error-text">{errors.plant_name[0]}</span>}
        </div>

        <div className="form-section">
          <p>Experiment description:</p>
          <input
            type="text"
            placeholder="Describe your experiment (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {errors.description && <span className="error-text">{errors.description[0]}</span>}
        </div>

        <div className="form-section">
          <p>Keywords:</p>
          <div className="keyword-input-wrapper">
            <input
              type="text"
              className={errors.keywords ? "input-error" : ""}
              placeholder="Add a keyword"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            />
            <button type="button" className="btn-create" onClick={handleAddKeyword}>
              ADD
            </button>
          </div>

          <div className="keywords-tags-container">
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
          {errors.keywords && <span className="error-text">{errors.keywords[0]}</span>}
        </div>

        <div className="dates-choices">
          <div className="date-choice">
            <label htmlFor="start_date">Start date:</label>
            <input
              className={errors.started_at ? "input-error" : ""}
              type="date"
              id="start_date"
              name="start_date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            {errors.started_at && <span className="error-text">{errors.started_at[0]}</span>}
          </div>

          <div className="date-choice">
            <label htmlFor="end_date">Planned end date:</label>
            <input
              className={errors.planned_end_at ? "input-error" : ""}
              type="date"
              id="end_date"
              name="end_date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {errors.planned_end_at && <span className="error-text">{errors.planned_end_at[0]}</span>}
          </div>
        </div>

        <div className="form-section">
          <p>Hardware set ID: <strong>{selectedSetup}</strong>. Reading frequency in hours:</p>
          <div className="frequency-grid">
            {sensors.map((sensor) => (
              <label key={sensor.key}>
                <span>{sensor.label}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 0,3"
                  className={errors.sensor_set_id && (!frequencies[sensor.key] || parseHours(frequencies[sensor.key]) <= 0) ? "input-error" : ""}
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

        <div className="add-collab">
          <p>Collaborators:</p>
        </div>

        <div className="is-public">
          <label htmlFor="experiment_public">
            <input 
              type="checkbox" 
              id="experiment_public" 
              name="experiment_public" 
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Make my experiment public and let other users see the data.
          </label>
        </div>

        <button className="btn-back" onClick={() => navigate(`/experiment/${id}`)}>
          <span>CANCEL</span>
        </button>

        <button className="btn-create" onClick={handleSave}>
          <span>SAVE CHANGES</span>
        </button>
      </div>
      </div>
    </div>
  );
}

export default Experiment_edit;

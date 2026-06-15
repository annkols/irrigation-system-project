import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import "../App.css";
import logo from "./images/logo_cultiva.svg";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function New_experiment() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [errors, setErrors] = useState({});
  const [frequencies, setFrequencies] = useState({});

  const sensorSetups = [
      {
        id: 1,
        title: 'BASIC',
        sensors: [
          { key: 'soil_moisture', label: 'soil moisture' },
          { key: 'air_temperature', label: 'air temperature' },
          { key: 'air_humidity', label: 'air humidity' }
        ]
      },
      {
        id: 2,
        title: 'EXTENDED',
        sensors: [
          { key: 'soil_moisture', label: 'soil moisture' },
          { key: 'air_temperature', label: 'air temperature' },
          { key: 'air_humidity', label: 'air humidity' },
          { key: 'light', label: 'light' }
        ]
      },
      {
        id: 3,
        title: 'FULL',
        sensors: [
          { key: 'air_humidity', label: 'air humidity' },
          { key: 'light', label: 'light' },
          { key: 'soil_moisture', label: 'soil moisture' },
          { key: 'pressure', label: 'pressure' },
          { key: 'soil_temperature', label: 'soil temperature' },
          { key: 'air_temperature', label: 'air temperature' }
        ]
      }
    ];

  const handleFreqChange = (sensor, value) => {
      setFrequencies(prev => ({
        ...prev,
        [sensor]: value
      }));
    };

  const handleCreate = () => {
    setErrors({});
    const localErrors = {};

    const currentTruncatedTime = new Date();
    currentTruncatedTime.setSeconds(0);
    currentTruncatedTime.setMilliseconds(0);

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

    if (!selectedSetup) {
      localErrors.sensor_set_id = ["Please select a sensor setup."];
    } else {
      const currentSetup = sensorSetups.find(s => s.id === selectedSetup);
      const invalidSensors = currentSetup.sensors.some(sensor => {
        const val = frequencies[sensor.key];
        const numVal = parseInt(val, 10);
        const isEmpty = !val || val.trim() === "";
        const isNotInteger = Number(val) !== numVal;
        const isOutOfRange = numVal <= 0 || numVal > 300;
        return isEmpty || isNotInteger || isOutOfRange;
      });
      if (invalidSensors) {
        localErrors.sensor_set_id = ["Frequencies must be whole numbers between 1 and 300 seconds."];
      }
    }

    if (!startDate) {
      localErrors.started_at = ["Start date is required."];
    } else {
      const startCompare = new Date(startDate);
      startCompare.setSeconds(0);
      startCompare.setMilliseconds(0);

      if (startCompare < currentTruncatedTime) {
        localErrors.started_at = ["The start date cannot be set in the past."];
      }
      
      const maxStartDate = new Date(currentTruncatedTime.getTime() + 24 * 60 * 60 * 1000);
      if (startCompare > maxStartDate) {
        localErrors.started_at = ["The start date can be set a maximum of 24 hours in advance."];
      }
    }

    if (!endDate) {
      localErrors.planned_end_at = ["Planned end date is required."];
    } else {
      const endCompare = new Date(endDate);
      endCompare.setSeconds(0);
      endCompare.setMilliseconds(0);

      if (endCompare < currentTruncatedTime) {
        localErrors.planned_end_at = ["The planned end date cannot be set in the past."];
      }

      if (startDate) {
        const startCompare = new Date(startDate);
        startCompare.setSeconds(0);
        startCompare.setMilliseconds(0);
        
        if (endCompare < startCompare) {
          localErrors.planned_end_at = ["The planned end date cannot be earlier than the start date."];
        }
      }
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    const currentSetup = sensorSetups.find(s => s.id === selectedSetup);
    const sensorFrequencies = Object.fromEntries(
      currentSetup.sensors.map(sensor => [
        sensor.key,
        parseInt(frequencies[sensor.key], 10)
      ])
    );
    const formatWithSafeSeconds = (dateString) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date.toISOString();
    };

    const formattedStartDate = formatWithSafeSeconds(startDate);
    const formattedEndDate = formatWithSafeSeconds(endDate);

    const newExperiment = {
      name,
      description,
      plant_name: plantName,
      sensor_set_id: selectedSetup,
      measurement_frequency_seconds: Math.min(...Object.values(sensorFrequencies)),
      sensor_frequencies: sensorFrequencies,
      started_at: formattedStartDate,
      planned_end_at: formattedEndDate,
      finished_at: null,
      owner: null,
      collaborators: []
    };

    console.log("Wysylane dane:", newExperiment);

    fetch(`${API_BASE_URL}/experiments/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newExperiment),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          toast.success("Experiment created!");
          navigate('/dashboard');
        } else {
          setErrors(data);
        }
      })
      .catch((err) => {
        console.error("Error creating experiment:", err);
        toast.error("Server connection error.");
      });
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

      <div className="form">
        <div className="new-exp-form">
          <h2>Add a new experiment</h2>
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
          <p>Tags:</p>
        </div>

        <div className="dates-choices">
          <div className="date-choice">
            <label htmlFor="start_date">Start date:</label>
            <input
              className={errors.started_at ? "input-error" : ""}
              type="datetime-local"
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
              type="datetime-local"
              id="end_date"
              name="end_date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {errors.planned_end_at && <span className="error-text">{errors.planned_end_at[0]}</span>}
          </div>
        </div>

        <div className="form-section">
          <p>Select available setups of sensors you would like to use, all setups include a water pump:</p>

          <div className="setup-container">
            {sensorSetups.map((setup) => (
              <div
                key={setup.id}
                className={`setup-card ${selectedSetup === setup.id ? 'selected' : ''}`}
                onClick={() => setSelectedSetup(setup.id)}
              >
                <h3>{setup.title}</h3>
                {selectedSetup === setup.id && (
                  <div className="setup-details" onClick={(e) => e.stopPropagation()}>
                    <p style={{ fontSize: '11px', marginBottom: '10px', opacity: 0.8 }}>
                      Set reading frequency for each sensor (seconds):
                    </p>
                      {setup.sensors.map((sensor) => (
                      <div key={sensor.key} className="sensor-freq-row">
                        <span className="sensor-name">{sensor.label}</span>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          step="1"
                          placeholder="seconds"
                          className={errors.sensor_set_id && (!frequencies[sensor.key] || frequencies[sensor.key] <= 0 || frequencies[sensor.key] > 300) ? "input-error" : ""}
                          value={frequencies[sensor.key] || ""}
                          onKeyDown={(e) => {
                            // nie wolno znaków e E , .
                            if (["e", "E", ".", ","].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => handleFreqChange(sensor.key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {errors.sensor_set_id && <span className="error-text">{errors.sensor_set_id[0]}</span>}
        </div>

        <div className="add-collab">
          <p>Collaborators:</p>
        </div>

        <div className="is-public">
          <label htmlFor="experiment_public">
            <input type="checkbox" id="experiment_public" name="experiment_public" value="true" />
            Make my experiment public and let other users see the data.
          </label>
        </div>

        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          <span>CANCEL</span>
        </button>

        <button className="btn-create" onClick={handleCreate}>
          <span>CREATE EXPERIMENT</span>
        </button>
      </div>
    </>
  );
}

export default New_experiment;

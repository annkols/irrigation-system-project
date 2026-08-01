import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

function New_experiment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // na którym kroku jest użytownik
  const [name, setName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [errors, setErrors] = useState({});
  const [frequencies, setFrequencies] = useState({});
  const [isPublic, setIsPublic] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

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

  const nextStep = () => {
  setErrors({});
  const localErrors = {};
  
  // WALIDACJA DLA KROKU 1
  if (step === 1) {
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

    if (!startDate) {
      localErrors.started_at = ["Start date is required."];
    }

    if (!endDate) {
      localErrors.planned_end_at = ["Planned end date is required."];
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
      localErrors.planned_end_at = ["Planned end date cannot be earlier than start date."];
    }
  }

  // WALIDACJA DLA KROKU 2
  if (step === 2) {
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
  }

  if (Object.keys(localErrors).length > 0) {
    setErrors(localErrors);
    return;
  }

  setStep(prev => Math.min(prev + 1, 3));
};

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleFreqChange = (sensor, value) => {
    setFrequencies(prev => ({
      ...prev,
      [sensor]: value
    }));
  };

  const handleCreate = () => {
    setErrors({});

    const currentSetup = sensorSetups.find(s => s.id === selectedSetup);
    if (!currentSetup) return;

    const sensorFrequencies = Object.fromEntries(
      currentSetup.sensors.map(sensor => [
        sensor.key,
        parseInt(frequencies[sensor.key], 10) || 0
      ])
    );

    const newExperiment = {
      name,
      description,
      plant_name: plantName,
      sensor_set_id: selectedSetup,
      measurement_frequency_seconds: Math.min(...Object.values(sensorFrequencies)),
      sensor_frequencies: sensorFrequencies,
      started_at: startDate || null,
      planned_end_at: endDate || null,
      finished_at: null,
      owner: null,
      collaborators: [],
      is_public: isPublic
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
    <div className="dashboard-page">
      <Sidebar />

      <div className="dashboard-content">
        <TopBar />

        <main className="content-body">
          {/* Progress bar */}
          <div className="steps-progress-bar">
            <div className={`step-circle ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-circle ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step-circle ${step >= 3 ? 'active' : ''}`}>3</div>
          </div>

          <div className="form-card">
            {/* Step 1 */}
            {step === 1 && (
              <div className="step-content">
                <div className="new-exp-form">
                  <h2>Describe your experiment</h2>
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
                  <p>Plant species:</p>
                  <input
                    className={errors.plant_name ? "input-error" : ""}
                    type="text"
                    placeholder="Type in type of plant"
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                  />
                  {errors.plant_name && <span className="error-text">{errors.plant_name[0]}</span>}
                </div>

                <div className="dates-choices">
                  <div className="date-choice">
                    <label htmlFor="start_date">Start date:</label>
                    <input
                      className={errors.started_at ? "input-error" : ""}
                      type="date"
                      id="start_date"
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
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                    {errors.planned_end_at && <span className="error-text">{errors.planned_end_at[0]}</span>}
                  </div>
                </div>

                <div className="form-section">
                  <p>Experiment description (optional):</p>
                  <textarea
                    className="description-textarea"
                    placeholder="Briefly describe the objectives and methods..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                  />
                  {errors.description && <span className="error-text">{errors.description[0]}</span>}
                </div>

                <div className="form-section">
                  <p>Tags:</p>
                </div>

                <div className="form-navigation">
                  <button className="btn-back" onClick={() => navigate('/dashboard')}>
                    <span>CANCEL</span>
                  </button>
                  <button className="btn-create" onClick={nextStep}>
                    <span>NEXT</span>
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="step-content">
                <div className="new-exp-form">
                  <h2>Configure sensor set</h2>
                </div>

                <div className="form-section">
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

                <div className="form-navigation">
                  <button className="btn-back" onClick={() => navigate('/dashboard')}>
                    <span>CANCEL</span>
                  </button>
                  <div className="nav-buttons-right">
                    <button className="btn-back" onClick={prevStep}>
                      <span className="material-symbols-outlined">arrow_back</span>
                      <span>BACK</span>
                    </button>
                    <button className="btn-create" onClick={nextStep}>
                      <span>NEXT</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="step-content">
                <div className="new-exp-form">
                  <h2>Add others to collaborate</h2>
                </div>

                <div className="add-collab">
                  <p>Collaborators:</p>
                </div>

                <div className="is-public">
                  <label htmlFor="experiment_public">
                    <input 
                      type="checkbox" 
                      id="experiment_public" 
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    Make my experiment public and let other users see the data.
                  </label>
                </div>

                <div className="form-navigation">
                  <button className="btn-back" onClick={() => navigate('/dashboard')}>
                    <span>CANCEL</span>
                  </button>
                  <div className="nav-buttons-right">
                    <button className="btn-back" onClick={prevStep}>
                      <span className="material-symbols-outlined">arrow_back</span>
                      <span>BACK</span>
                    </button>
                    <button className="btn-create" onClick={handleCreate}>
                      <span>CREATE</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default New_experiment;
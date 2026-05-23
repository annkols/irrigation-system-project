import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../App.css";
import logo from "./images/logo_cultiva.svg";

function New_experiment() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [errors, setErrors] = useState({});

  const sensorSetups = [
    { id: 1, title: 'BASIC', desc: 'temperature humidity' },
    { id: 2, title: 'EXTENDED', desc: 'temperature humidity light' },
    { id: 3, title: 'FULL', desc: 'temperature humidity light pH' }
  ];

  const handleCreate = () => {
    setErrors({});
    const localErrors = {};

    if (!name.trim()) {
      localErrors.name = ["This field is required."];
    } else if (name.length > 100) {
      localErrors.name = ["Ensure the name has no more than 100 characters."];
    }

    if (plantName.length > 100) {
      localErrors.plant_name = ["Ensure the plant type has no more than 100 characters."];
    }

    if (description.length > 2000) {
      localErrors.description = ["Ensure the description has no more than 1000 characters."];
    }

    if (!selectedSetup) {
      localErrors.sensor_set_id = ["Please select a sensor setup."];
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      localErrors.finished_at = ["End date cannot be earlier than start date."];
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    const newExperiment = {
      name,
      description,
      plant_name: plantName,
      sensor_set_id: selectedSetup,
      started_at: startDate || null,
      finished_at: endDate || null,
      owner: null,
      collaborators: []
    };

    console.log("Wysylane dane:", newExperiment);

    fetch("http://localhost:8000/api/experiments/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newExperiment),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          alert("Experiment created!");
          navigate('/dashboard');
        } else {
          setErrors(data);
        }
      })
      .catch((err) => {
        console.error("Error creating experiment:", err);
        alert("Server connection error.");
      });
  };

  return (
    <>
      <header className="header">
        <div className="logo">
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
              type="date"
              id="start_date"
              name="start_date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="date-choice">
            <label htmlFor="end_date">Planned end date:</label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {errors.finished_at && <span className="error-text">{errors.finished_at[0]}</span>}
          </div>
        </div>

        <div className="form-section">
          <p>Select available setups of sensors you would like to use:</p>

          <div className="setup-container">
            {sensorSetups.map((setup) => (
              <div
                key={setup.id}
                className={`setup-card ${selectedSetup === setup.id ? 'selected' : ''}`}
                onClick={() => setSelectedSetup(setup.id)}
              >
                <h3>{setup.title}</h3>
                <p>{setup.desc}</p>
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
          <span>BACK</span>
        </button>

        <button className="btn-create" onClick={handleCreate}>
          <span>CREATE EXPERIMENT</span>
        </button>
      </div>
    </>
  );
}

export default New_experiment;

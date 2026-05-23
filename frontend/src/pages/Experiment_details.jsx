import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import "../App.css";
import logo from "./images/logo_cultiva.svg";

function Experiment_details() {
  const { id } = useParams();
  const navigate = useNavigate();

  // mock data 
  const experiment = {
    id: id,
    name: "SOY EXPERIMENT",
    plantName: "Soybean",
    description: "Testing growth conditions for soybean crops.",
    status: "in-progress",
    startDate: "01.03.2026",
    endDate: "31.03.2026",
    sensors: ["Temperature", "Air humidity", "Soil moisture", "Light intensity"],
    collaborators: ["Anna K.", "Igor J."],
  };

  const stats = {
    temperature: "20",
    soilMoisture: "30",
    airHumidity: "50",
    light: "90",
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
          <h2>{experiment.name}</h2>
          <span className={`badge ${experiment.status}`}>
            {experiment.status === "in-progress" ? "IN PROGRESS" : "SOON ENDING"}
          </span>
        </div>

        <div className="form-section">
          <p>Plant type:</p>
          <span>{experiment.plantName}</span>
        </div>

        <div className="form-section">
          <p>Description:</p>
          <span>{experiment.description}</span>
        </div>

        <div className="dates-choices">
          <div className="date-choice">
            <p>Start date:</p>
            <span>{experiment.startDate}</span>
          </div>
          <div className="date-choice">
            <p>Planned end date:</p>
            <span>{experiment.endDate}</span>
          </div>
        </div>

        <div className="form-section">
          <p>Current measurements:</p>
          <div className="stats">
            <div className="row"><span>Temperature</span><span>{stats.temperature} °C</span></div>
            <div className="row"><span>Soil moisture</span><span>{stats.soilMoisture} %</span></div>
            <div className="row"><span>Air humidity</span><span>{stats.airHumidity} %</span></div>
            <div className="row"><span>Light intensity</span><span>{stats.light} lx</span></div>
          </div>
        </div>

        <div className="form-section">
          <p>Sensors:</p>
          <div className="setup-container">
            {experiment.sensors.map((sensor, index) => (
              <div key={index} className="setup-card">
                <p>{sensor}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <p>Collaborators:</p>
          <div>
            {experiment.collaborators.map((c, index) => (
              <span key={index} style={{ marginRight: "12px" }}>{c}</span>
            ))}
          </div>
        </div>

        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          <span>BACK</span>
        </button>
      </div>
    </>
  );
}

export default Experiment_details;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../App.css";
import bgImage from "./images/back.jpg";
import logo from "./images/logo_cultiva.svg";

function New_experiment() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSetup, setSelectedSetup] = useState(null);

  //for choosing sensor setup, mocked data
  const sensorSetups = [
    { id: 1, title: 'BASIC', desc: 'temperature humidity' },
    { id: 2, title: 'EXTENDED', desc: 'temperature humidity light' },
    { id: 3, title: 'FULL', desc: 'temperature humidity light pH' }
  ];

  const handleCreate = () => {
    const newExperiment = {
      name: name,
      description: description,
      plant_name: plantName,
      sensor_set_id: selectedSetup,
      started_at: startDate || null,
      finished_at: endDate || null,
      owner: null, // na sztywno bo nie ma logowania
      collaborators: []
    };

    console.log("Wysy³ane dane:", newExperiment);

    fetch("http://localhost:8000/api/experiments/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newExperiment),
    })
      .then((res) => {
        if (res.ok) {
          alert("Experiment created!");
          navigate('/dashboard');
        } else {
          return res.json().then(err => { throw err; });
        }
      })
      .catch((err) => {
        console.error("Error creating experiment:", err);
        alert("Coœ posz³o nie tak.");
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
        <h2>Add a new experiment</h2>


        <p>Experiment name:</p>
        <input 
            type="text" 
            placeholder="Name your experiment" 
            value={name}
            onChange={(e) => setName(e.target.value)}
        />

        <p>Plant type:</p>
        <input 
            type="text" 
            placeholder="Type in type of plant" 
            value={plantName}
            onChange={(e) => setPlantName(e.target.value)}
        />

        <p>Experiment description:</p>
        <input 
            type="text" 
            placeholder="Describe your experiment (optional)" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
        />

        <p>Tags:</p>

        <p>
          <label htmlFor="start_date">Start date:</label>
          <input 
            type="date" 
            id="start_date" 
            name="start_date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </p>

        <p>
          <label htmlFor="end_date">Planned end date:</label>
          <input 
            type="date" 
            id="end_date" 
            name="end_date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </p>

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

        <p>Collabolators:</p>

        <p>
            <label htmlFor="experiment_public">
               <input type="checkbox" id="experiment_public" name="experiment_public" value="true" />
               Make my experiment public and let other users see the data.
            </label>
        </p>
        

          <button 
              onClick={() => navigate('/dashboard')}
          >
              <span>BACK</span>
          </button>

          <button onClick={handleCreate}>
              <span>CREATE EXPERIMENT</span>
          </button>

      </div> 
    </>
  );
}

export default New_experiment;

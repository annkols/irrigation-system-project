import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../App.css";
import bgImage from "./images/back.jpg";
import logo from "./images/logo_cultiva.svg";

function New_experiment() {
  const navigate = useNavigate();
  const [selectedSetup, setSelectedSetup] = useState(null);

  //for choosing sensor setup, mocked data
  const sensorSetups = [
    { id: 'basic', title: 'BASIC', desc: 'temperature humidity' },
    { id: 'pro', title: 'EXTENDED', desc: 'temperature humidity light' },
    { id: 'hydro', title: 'FULL', desc: 'temperature humidity light pH' }
  ];

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
            //className=""
        />

        <p>Plant type:</p>
        <input 
            type="text" 
            placeholder="Type in type of plant" 
            //className=""
        />

        <p>Experiment description:</p>
        <input 
            type="text" 
            placeholder="Describe your experiment (optional)" 
            //className=""
        />

        <p>Tags:</p>

        <p>
          <label htmlFor="start_date">Start date:</label>
          <input 
            type="date" 
            id="start_date" 
            name="start_date" 
          />
        </p>

        <p>
          <label htmlFor="end_date">Planned end date:</label>
          <input 
            type="date" 
            id="end_date" 
            name="end_date" 
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
            <label for="experiment_public">
               <input type="checkbox" id="experiment_public" name="experiment_public" value="true" />
               Make my experiment public and let other users see the data.
            </label>
        </p>
        

          <button 
              onClick={() => navigate('/dashboard')}
          >
              <span>BACK</span>
          </button>

          <button 
              onClick={() => navigate('/dashboard')}
          >
              <span>CREATE EXPERIMENT</span>
          </button>

      </div> 
    </>
  );
}

export default New_experiment;

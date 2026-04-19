import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../App.css"; 

function App() {
  
  const navigate = useNavigate();

  const data = {
    name: "SOY EXPERIMENT",
    date: "22.03.2026",
    time: "21:37",
    temperature: "20",
    soilMoisture: "30",
    airHumidity: "50",
    light: "90"
  }

  return (
    
    <>
      <header className="header">
        <h1>NAZWA APLIKACJI</h1>
        <div className="icons">
          <span className="material-symbols-outlined">account_circle</span>
          <span className="material-symbols-outlined">settings</span>
          <span className="material-symbols-outlined">more_vert</span>
        </div>
      </header>

      <div className="container">

        {/* left */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2>{data.name}</h2>
            </div>
            <div className="date">
              <span>{data.date}</span>
              
              <span>{data.time}</span>
            </div>
          </div>

          <div className="image-placeholder" />

          <div className="stats">
            <p>Temperature: <span>{data.temperature}°C</span></p>
            <p>Moisture content: <span>{data.soilMoisture} %</span></p>
            <p>Air humidity: <span>{data.airHumidity} %</span></p>
            <p>Light intensity: <span>{data.light} lx</span></p>
          </div>
        </div>

        {/* right */}
        <div className="dashboard">
          <div className="welcome">
            <h2>Hello User!</h2>
            <p>Manage all your experiments and reports below:</p>
          </div>

          <div className="events">
            <span>See all recent events</span>
            <span className="material-symbols-outlined">potted_plant</span>
          </div>

          <div className="actions">
            <button className="action">Add a new experiment: 
            <span className="material-symbols-outlined">add_2</span>
            </button>
            <button className="action-big">Manage your experiments:
            <span className="material-symbols-outlined">add_2</span>
            </button>

            <button className="action">Your past experiments:
            <span className="material-symbols-outlined">add_2</span>
            </button>
            <button className="action">Your reports:
            <span className="material-symbols-outlined">add_2</span>
            </button>
            <button className="action">Add a new experiment:
              <span className="material-symbols-outlined">add_2</span>
            </button>
          </div>
        </div>

      </div>
    </>
  )
}

export default App
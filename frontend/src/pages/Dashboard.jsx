import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../App.css";
import bgImage from "./images/back.jpg";
import logo from "./images/logo_cultiva.svg";

function App() {
  
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState("all");
  const experiments = [
    { id: 1, name: "SOY EXPERIMENT", status: "in-progress", endDate: "31.03.2026" },
    { id: 2, name: "WHEAT TEST", status: "soon", endDate: "15.05.2026" }
  ];
  
  const now = new Date();
  const nowDate = now.toLocaleDateString("pl-PL");
  const nowTime = now.toLocaleTimeString("pl-PL",{
    hour: "2-digit",
    minute: "2-digit"
  });

  const mock = [{
    temperature: "20",
    soilMoisture: "30",
    airHumidity: "50",
    light: "90"
  }]
  const stats = mock[0];

  const statusMap={
    all: "ALL",
    "in-progress": "IN PROGRESS",
    soon: "SOON ENDING",
  };

  const filtered = experiments.filter((exp) =>
    filter === "all" ? true : exp.status === filter
  );
  
  // state for getting measurements from backend
  const [measurements, setMeasurements] = useState([]);
  const [selectedId, setSelectedId] = useState(1);
  useEffect(() => {
      const fetchData = () => {
        fetch("http://localhost:8000/api/measurements/")
          .then(res => res.json())
          .then(data => setMeasurements(data))
          .catch(err => console.error(err));
      };

      fetchData();

      const interval = setInterval(fetchData, 10000);

      return () => clearInterval(interval);
    }, []);

    const latest = measurements.length > 0 
      ? measurements[measurements.length - 1] 
      : null;

    const mainexp = experiments.find(exp =>exp.id === selectedId);


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

      <div className="container">

        {/* left */}
        <div className="card">
          <div className="image-placeholder" style={{ backgroundImage: `url(${bgImage})` }}>
            <div className="card-header">
              <div>
                <h2>{mainexp.name}</h2>
              </div>
              <div className="date">
                <span>{nowDate}</span>
              
                <span>{nowTime}</span>
              </div>
            </div>
            <div className='img-bottom'>
              <div className='progress-bar'>
                  <div className='progress' />
              </div>
              <span className='status in-progress'>IN PROGRESS</span>
            </div>
          </div>



          <div className="stats">
          <div className="row"> <span>Temperature</span><span>{stats.temperature}°C</span></div>
          <div className="row"><span>Moisture content:</span> <span>{stats.soilMoisture} %</span></div>
          <div className="row"><span>Air humidity: </span><span>{stats.airHumidity} %</span></div>
          <div className="row"><span>Light intensity: </span><span>{stats.light} lx</span></div>
          <div className="row"><span>Soil moisture: </span><span>{latest?.moisture_percent ?? "-"} %</span></div> {/* shows latest soil moisture from backend, or "-" if no data*/ }
          </div>
        </div>

        {/* right */}
        <div className="dashboard">
          <div className="welcome">
            <h2>HELLO USER!</h2>
            <p>YOU HAVE CURRENTLY {experiments.length} EXPERIMENTS</p>
          </div>

          <button className='add-btn'>
            <span>ADD A NEW EXPERIMENT</span>
            <span className="material-symbols-outlined">add</span>
          </button>

          <div className='section-header'>
            <span>ALL YOUR EXPERIMENTS</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </div>

          <div className='filters'>
            {Object.keys(statusMap).map((key) => (
              <button key={key} onClick={() => setFilter(key)}
              className={`filter-btn filter-${key} ${filter === key ? "active":""}`}>
              {statusMap[key]}
              </button>
            ))}
          </div>

          <div className="list">
            {filtered.map((exp) => (
              <div key={exp.id} className="item" onClick={() => setSelectedId(exp.id)}>
                <p>{exp.name}</p>
                <span className={`badge ${exp.status}`}>
                  {statusMap[exp.status]}
                </span>
                <span className="item-date">{exp.endDate}</span>
              </div>
            ))}
          </div>

          <button className='action'>
            <span>SEARCH FOR EXPERIMENTS</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          <button className='action'>
            <span>BROWSE REPORTS</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>

      </div>

      {/* raw measurements z backendu */}
      <div className="log">
        <h3>Raw measurements</h3>

        {measurements.map((m, index) => (
          <div key={index}>
            [{m.device_name}] raw: {m.raw_value}, moisture: {m.moisture_percent}%
          </div>
        ))}
      </div>
    </>
  )
}

export default App

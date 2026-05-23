import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../App.css";
import bgImage from "./images/back.jpg";
import logo from "./images/logo_cultiva.svg";

function App() {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [measurements, setMeasurements] = useState([]);
  const [selectedId, setSelectedId] = useState(1);

  const experiments = [
    { id: 1, name: "SOY EXPERIMENT", status: "in-progress", endDate: "31.03.2026", tags: ["SOY", "BACTERIA"], collaborators: ["Anna N.", "Jan K.", "Katarzyna W."], description: "Testing growth conditions for soybean crops in controlled environment." },
    { id: 2, name: "WHEAT TEST", status: "soon", endDate: "15.05.2026", tags: ["WHEAT"], collaborators: ["Igor J."], description: "Wheat growth experiment under varied light conditions." }
  ];

  const now = new Date();
  const nowDate = now.toLocaleDateString("pl-PL");
  const nowTime = now.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const statusMap = {
    all: "ALL",
    "in-progress": "IN PROGRESS",
    soon: "SOON ENDING",
  };

  const filtered = experiments.filter((exp) =>
    filter === "all" ? true : exp.status === filter
  );

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

  const latest = measurements.length > 0 ? measurements[0] : null;
  const mainexp = experiments.find(exp => exp.id === selectedId);

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

          {detailsOpen ? (
            <div className="exp-details">
              <div className="exp-tags">
                {mainexp.tags.map((tag, i) => <span key={i} className="exp-tag">{tag}</span>)}
                <span className="exp-tag exp-tag-add">+</span>
              </div>
              <div className="exp-section">
                <span className="exp-label">Collaborators:</span>
                <div className="exp-collaborators">
                  {mainexp.collaborators.map((c, i) => (
                    <span key={i} className="collab-chip">{c} ×</span>
                  ))}
                  <span className="collab-chip collab-chip-add">+</span>
                  <span className="exp-show-all">Show all</span>
                </div>
              </div>
              <div className="exp-section">
                <span className="exp-label">Description:</span>
                <p className="exp-description">{mainexp.description}</p>
              </div>
              <div className="exp-actions">
                <span className="material-symbols-outlined">edit</span>
                <span className="material-symbols-outlined">settings</span>
                <span className="material-symbols-outlined">delete</span>
              </div>
            </div>
          ) : (
            <div className="stats">
              <div className="row"><span>Temperature</span><span>{latest?.air_temperature ?? "-"} °C</span></div>
              <div className="row"><span>Moisture content:</span><span>{latest?.moisture_percent ?? "-"} %</span></div>
              <div className="row"><span>Air humidity:</span><span>{latest?.air_humidity ?? "-"} %</span></div>
              <div className="row"><span>Light intensity:</span><span>{latest?.light_lux ?? "-"} lx</span></div>
              <div className="row"><span>Soil temperature:</span><span>{latest?.soil_temperature ?? "-"} °C</span></div>
              <div className="row"><span>Pressure:</span><span>{latest?.pressure_hpa ?? "-"} hPa</span></div>
              <div className="row"><span>Pump:</span><span>{latest ? (latest.pump_on ? "ON" : "OFF") : "-"}</span></div>
            </div>
          )}
        </div>

        {/* right wrapper */}
        <div className="right-panel-wrapper">

          {/* measurements panel - visible when details open */}
          {detailsOpen && (
            <div className="measurements-panel">
              <button className="action">
                <span>FULL EXPERIMENT HISTORY</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <div className="readings-spacer" />
              <div className="readings-header">
                <span className="readings-title">LATEST READING</span>
                <div className="readings-date">
                  <span>{nowDate}</span>
                  <span>{nowTime}</span>
                </div>
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
              <p className="next-reading">Next reading in 23 minutes</p>
            </div>
          )}

          {/* arrow to bring back list */}
          {detailsOpen && (
            <button className="panel-toggle" onClick={() => setDetailsOpen(false)}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          )}

          {/* experiment list */}
          <div className={`dashboard${detailsOpen ? ' dashboard-hidden' : ''}`}>
            <div className="welcome">
              <h2>HELLO USER!</h2>
              <p>YOU HAVE CURRENTLY {experiments.length} EXPERIMENTS</p>
            </div>

            <button className='add-btn' onClick={() => navigate('/new-experiment')}>
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
                  className={`filter-btn filter-${key} ${filter === key ? "active" : ""}`}>
                  {statusMap[key]}
                </button>
              ))}
            </div>

            <div className="list">
              {filtered.map((exp) => (
                <div key={exp.id} className="item" onClick={() => { setSelectedId(exp.id); setDetailsOpen(true); }}>
                  <p>{exp.name}</p>
                  <span className={`badge ${exp.status}`}>{statusMap[exp.status]}</span>
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
      </div>

      <div className="log">
        <h3>Measurements</h3>
        {measurements.map((m, index) => (
          <div key={index}>
            [station {m.station_number}, pot {m.pot_number}] moisture: {m.moisture_percent}%,
            air: {m.air_temperature ?? "-"} C, humidity: {m.air_humidity ?? "-"}%,
            light: {m.light_lux ?? "-"} lx, pump: {m.pump_on ? "ON" : "OFF"}
          </div>
        ))}
      </div>
    </>
  )
}

export default App

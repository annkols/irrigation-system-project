import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "../App.css"; 

function App() {
  
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState("all");
  const experiments = [
    { id: 1, name: "SOY EXPERIMENT", status: "in-progress" },
    { id: 2, name: "WHEAT TEST", status: "soon" }
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
        <h1>CULTIVA</h1>
        <div className="icons">
          <span className="material-symbols-outlined">account_circle</span>
          <span className="material-symbols-outlined">settings</span>
          <span className="material-symbols-outlined">more_vert</span>
        </div>
      </header>

      <div className="container">

        {/* left */}
        <div className="card">
          <div className="image-placeholder">
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
            <h2>Hello User!</h2>
            <p>You have currently {experiments.length} experiments</p>
          </div>

          <button className='add-btn'>
            <span>Add a new experiment</span>
            <span className="material-symbols-outlined">potted_plant</span>
            </button>

          <button className='action'>
            ALL YOUR EXPERIMENTS
          </button>

          <div className='filters'>
            {Object.keys(statusMap).map((key) => (
              <button key={key} onClick={() => setFilter(key)} 
              className={`filter-btn $ {filter === key ? "active":""}`}>
              {statusMap[key]}
              </button>
            ))}
          </div>

          <div className="list">
            {filtered.map((exp) => (
              <div key ={exp.id} className="item" onClick={() => selectedId(exp.id)}>
                <p>{exp.name}</p>
                <div className="item-detail">
                  <span className={`badge ${exp.status}`}>
                    {statusMap[exp.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button className='action'>
            SEARCH FOR EXPERIMENTS
          </button>

          <button className='action'>
            BROWSE REPORTS
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

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import "../App.css";
import logo from "./images/logo_cultiva.svg";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const MAX_TABLES = 20;
const MAX_POTS_PER_TABLE = 40;

const createTableConfigs = (count, previousConfigs = []) => {
  const safeCount = Number.isInteger(count) && count > 0 ? Math.min(count, MAX_TABLES) : 1;

  return Array.from({ length: safeCount }, (_, index) => {
    const tableNumber = index + 1;
    const previous = previousConfigs.find(config => config.table_number === tableNumber);
    return {
      table_number: tableNumber,
      pot_count: previous?.pot_count || "1",
    };
  });
};

function Experiment_edit() {
  const navigate = useNavigate();
  const {id} = useParams();
  const [name, setName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tableCount, setTableCount] = useState("1");
  const [tableConfigs, setTableConfigs] = useState(createTableConfigs(1));
  const [selectedSetup, setSelectedSetup] = useState(null);
  const [errors, setErrors] = useState({});
  const [frequencies, setFrequencies] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  const sensorPackages = [
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

    useEffect(() => {
      fetch(`${API_BASE_URL}/experiments/${id}/`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch experiment data");
          return res.json();
        })
        .then((data) => {
          setName(data.name || "");
          setPlantName(data.plant_name || "");
          setDescription(data.description || "");
          setIsPublic(data.is_public || false);
      
          if (data.started_at) setStartDate(data.started_at.split('T')[0]);
          if (data.planned_end_at) setEndDate(data.planned_end_at.split('T')[0]);
          const configs = data.table_configs?.length
            ? data.table_configs.map(config => ({
                table_number: config.table_number,
                pot_count: String(config.pot_count)
              }))
            : createTableConfigs(data.table_count || 1, []).map(config => ({
                ...config,
                pot_count: String(data.pots_per_table || 1)
              }));
          setTableCount(String(configs.length || 1));
          setTableConfigs(configs);
      
          setSelectedSetup(data.sensor_package_variant);
      
          if (data.sensor_frequencies) {
            const stringFreqs = {};
            Object.entries(data.sensor_frequencies).forEach(([key, val]) => {
              stringFreqs[key] = String(val);
            });
            setFrequencies(stringFreqs);
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          toast.error("Error loading experiment details.");
          navigate('/dashboard');
        });
    }, [id, navigate]);

  const handleFreqChange = (sensor, value) => {
      setFrequencies(prev => ({
        ...prev,
        [sensor]: value
      }));
    };

  const handleTableCountChange = (value) => {
    setTableCount(value);
    const parsedValue = parseInt(value, 10);

    if (Number(value) === parsedValue && parsedValue >= 1 && parsedValue <= MAX_TABLES) {
      setTableConfigs(prev => createTableConfigs(parsedValue, prev));
    }
  };

  const handleTablePotCountChange = (tableNumber, value) => {
    setTableConfigs(prev => prev.map(config => (
      config.table_number === tableNumber
        ? { ...config, pot_count: value }
        : config
    )));
  };

  const handleSave = () => {
    setErrors({});
    const localErrors = {};

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
      localErrors.sensor_package_variant = ["Please select a sensor package."];
    } else {
      const currentSetup = sensorPackages.find(s => s.id === selectedSetup);
      const invalidSensors = currentSetup.sensors.some(sensor => {
        const val = frequencies[sensor.key];
        const numVal = parseInt(val, 10);
        const isEmpty = !val || val.trim() === "";
        const isNotInteger = Number(val) !== numVal;
        const isOutOfRange = numVal <= 0 || numVal > 300;
        return isEmpty || isNotInteger || isOutOfRange;
      });
      if (invalidSensors) {
        localErrors.sensor_package_variant = ["Frequencies must be whole numbers between 1 and 300 seconds."];
      }
    }

    if (!startDate) {
      localErrors.started_at = ["Start date is required."];
    }

    if (!endDate) {
      localErrors.planned_end_at = ["Planned end date is required."];
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
      localErrors.planned_end_at = ["Planned end date cannot be earlier than start date."];
    }

    const tableCountValue = parseInt(tableCount, 10);
    if (
      !tableCount ||
      Number(tableCount) !== tableCountValue ||
      tableCountValue < 1 ||
      tableCountValue > MAX_TABLES
    ) {
      localErrors.table_count = [`Number of tables must be a whole number from 1 to ${MAX_TABLES}.`];
    }

    const normalizedTableConfigs = tableConfigs.map(config => ({
      table_number: config.table_number,
      pot_count: parseInt(config.pot_count, 10)
    }));

    const invalidTableConfig = tableConfigs.some((config) => {
      const value = parseInt(config.pot_count, 10);
      return (
        !config.pot_count ||
        Number(config.pot_count) !== value ||
        value < 1 ||
        value > MAX_POTS_PER_TABLE
      );
    });

    if (invalidTableConfig || normalizedTableConfigs.length !== tableCountValue) {
      localErrors.table_configs = [`Number of pots for each table must be a whole number from 1 to ${MAX_POTS_PER_TABLE}.`];
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    const currentSetup = sensorPackages.find(s => s.id === selectedSetup);
    const sensorFrequencies = Object.fromEntries(
      currentSetup.sensors.map(sensor => [
        sensor.key,
        parseInt(frequencies[sensor.key], 10)
      ])
    );

    const updatedExperiment = {
      name,
      description,
      plant_name: plantName,
      table_count: tableCountValue,
      table_configs: normalizedTableConfigs,
      measurement_frequency_seconds: Math.min(...Object.values(sensorFrequencies)),
      sensor_frequencies: sensorFrequencies,
      started_at: startDate || null,
      planned_end_at: endDate || null,
      is_public: isPublic
    };

    console.log("Wysylane dane edycji:", updatedExperiment);

    fetch(`${API_BASE_URL}/experiments/${id}/edit/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedExperiment),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok) {
            toast.success("Experiment updated successfully!");
            navigate(`/experiment/${id}`);
          } else {
            setErrors(data);
          }
        })
        .catch((err) => {
          console.error("Error updating experiment:", err);
          toast.error("Server connection error.");
        });
    };

    if (isLoading) {
      return <div className="loading">Loading experiment data...</div>;
    }

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
          <h2>Edit experiment</h2>
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
              type="date"
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
              type="date"
              id="end_date"
              name="end_date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {errors.planned_end_at && <span className="error-text">{errors.planned_end_at[0]}</span>}
          </div>
        </div>

        <div className="dates-choices">
          <div className="date-choice">
            <label htmlFor="table_count">Number of tables:</label>
            <input
              className={errors.table_count ? "input-error" : ""}
              type="number"
              id="table_count"
              name="table_count"
              min="1"
              max={MAX_TABLES}
              step="1"
              value={tableCount}
              onKeyDown={(e) => {
                if (["e", "E", ".", ","].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => handleTableCountChange(e.target.value)}
            />
            {errors.table_count && <span className="error-text">{errors.table_count[0]}</span>}
          </div>
        </div>

        <div className="form-section">
          <p>Pots on each table:</p>
          {tableConfigs.map((config) => (
            <div className="sensor-freq-row" key={config.table_number}>
              <span className="sensor-name">Table {config.table_number}</span>
              <input
                className={errors.table_configs ? "input-error" : ""}
                type="number"
                id={`table_${config.table_number}_pot_count`}
                name={`table_${config.table_number}_pot_count`}
                min="1"
                max={MAX_POTS_PER_TABLE}
                step="1"
                value={config.pot_count}
                onKeyDown={(e) => {
                  if (["e", "E", ".", ","].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => handleTablePotCountChange(config.table_number, e.target.value)}
              />
            </div>
          ))}
          {errors.table_configs && <span className="error-text">{errors.table_configs[0]}</span>}
        </div>

        <div className="form-section">
          <p>Select available setups of sensors you would like to use, all setups include a water pump:</p>

          <div className="setup-container" style={{ opacity: 0.85 }}>
          {sensorPackages.map((setup) => {
            const isSelected = selectedSetup === setup.id;
            return (
              <div
                key={setup.id}
                className={`setup-card ${isSelected ? 'selected' : 'disabled-card'}`}
                onClick={null} 
                style={{ cursor: 'not-allowed' }}
              >
                <h3>{setup.title}</h3>
                {isSelected && (
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
                          className={errors.sensor_package_variant && (!frequencies[sensor.key] || frequencies[sensor.key] <= 0 || frequencies[sensor.key] > 300) ? "input-error" : ""}
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
            );
          })}
        </div>
          {errors.sensor_package_variant && <span className="error-text">{errors.sensor_package_variant[0]}</span>}
        </div>

        <div className="add-collab">
          <p>Collaborators:</p>
        </div>

        <div className="is-public">
          <label htmlFor="experiment_public">
            <input 
              type="checkbox" 
              id="experiment_public" 
              name="experiment_public" 
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Make my experiment public and let other users see the data.
          </label>
        </div>

        <button className="btn-back" onClick={() => navigate(`/experiment/${id}`)}>
          <span>CANCEL</span>
        </button>

        <button className="btn-create" onClick={handleSave}>
          <span>SAVE CHANGES</span>
        </button>
      </div>
    </>
  );
}

export default Experiment_edit;



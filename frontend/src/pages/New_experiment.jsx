import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

const SENSORS = [
  ["air_temperature", "Air temperature", "shared"],
  ["air_humidity", "Air humidity", "shared"],
  ["pressure", "Pressure", "shared"],
  ["light", "Light intensity", "shared"],
  ["soil_moisture", "Soil moisture", "per pot"],
  ["soil_temperature", "Soil temperature", "per pot"],
];
const level = (label = "", reference = false) => ({ label, value: "", is_reference: reference });
const keyOf = (combination) => combination.map((item) => item.label).join("\u001f");
const parseHours = (value) => Number(String(value).trim().replace(",", "."));
const hoursToSeconds = (value) => Math.max(1, Math.round(parseHours(value) * 3600));
const cartesian = (lists) => lists.reduce(
  (rows, items) => rows.flatMap((row) => items.map((item) => [...row, item])),
  [[]],
);

function New_experiment() {
  const navigate = useNavigate();
  const api = import.meta.env.VITE_API_URL;
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [sensorSetId, setSensorSetId] = useState(1);
  const [frequencies, setFrequencies] = useState(Object.fromEntries(SENSORS.map(([id]) => [id, "1"])));
  const [factors, setFactors] = useState([{ name: "", unit: "", levels: [level("Control", true), level()] }]);
  const [repetitions, setRepetitions] = useState(1);
  const [excluded, setExcluded] = useState([]);
  const [hardware, setHardware] = useState({});
  const [cameras, setCameras] = useState([{ camera_id: "", pot_label: "" }, { camera_id: "", pot_label: "" }]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const combinations = useMemo(() => {
    if (factors.some((factor) => !factor.name.trim() || factor.levels.some((item) => !item.label.trim()))) return [];
    return cartesian(factors.map((factor) => factor.levels));
  }, [factors]);
  const selected = combinations.filter((combination) => !excluded.includes(keyOf(combination)));
  const pots = useMemo(() => {
    let number = 1;
    return selected.flatMap((combination) => Array.from(
      { length: Number(repetitions) || 0 },
      (_, index) => ({ label: `P${number++}`, replicate: index + 1, combination }),
    ));
  }, [selected, repetitions]);

  const changeFactor = (index, patch) => {
    setFactors((items) => items.map((item, current) => current === index ? { ...item, ...patch } : item));
    setExcluded([]);
  };
  const changeLevel = (factorIndex, levelIndex, patch) => {
    setFactors((items) => items.map((factor, currentFactor) => {
      if (currentFactor !== factorIndex) return factor;
      let levels = factor.levels.map((item, currentLevel) => currentLevel === levelIndex ? { ...item, ...patch } : item);
      if (patch.is_reference) levels = levels.map((item, currentLevel) => ({ ...item, is_reference: currentLevel === levelIndex }));
      return { ...factor, levels };
    }));
    setExcluded([]);
  };
  const changeHardware = (label, patch) => setHardware((items) => ({
    ...items,
    [label]: { is_monitored: false, soil_moisture: "", soil_temperature: "", pump: "", ...items[label], ...patch },
  }));

  const validate = () => {
    const next = {};
    if (step === 1) {
      if (!name.trim()) next.name = "Experiment name is required.";
      if (!plantName.trim()) next.plant = "Plant species is required.";
      if (!startDate || !endDate) next.dates = "Both dates are required.";
      if (startDate && endDate && new Date(endDate) < new Date(startDate)) next.dates = "End date cannot be earlier than start date.";
      if (!keywords.length) next.keywords = "Add at least one keyword.";
    }
    if (step === 2) {
      if (!factors.length) next.factors = "Add at least one factor.";
      factors.forEach((factor) => {
        if (!factor.name.trim() || factor.levels.length < 2 || factor.levels.some((item) => !item.label.trim())) next.factors = "Every factor needs a name and at least two named levels.";
        if (factor.levels.filter((item) => item.is_reference).length !== 1) next.factors = "Select exactly one reference level for every factor.";
      });
    }
    if (step === 3) {
      if (!selected.length) next.plan = "Select at least one combination.";
      if (!Number.isInteger(Number(repetitions)) || Number(repetitions) < 1 || Number(repetitions) > 50) next.plan = "Repetitions must be between 1 and 50.";
      if (pots.length > 500) next.plan = "The plan may contain at most 500 pots.";
    }
    if (step === 4) {
      if (!Number.isInteger(Number(sensorSetId)) || Number(sensorSetId) < 1) next.hardware = "Enter a valid Hardware set ID.";
      if (SENSORS.some(([id]) => !Number.isFinite(parseHours(frequencies[id])) || parseHours(frequencies[id]) <= 0)) next.hardware = "Frequencies must be positive numbers of hours, for example 1 or 0,3.";
      const deviceTypes = ["soil_moisture", "soil_temperature", "pump"];
      const duplicatedType = deviceTypes.find((type) => {
        const identifiers = Object.values(hardware)
          .map((assignment) => assignment[type]?.trim().toLowerCase())
          .filter(Boolean);
        return new Set(identifiers).size !== identifiers.length;
      });
      if (duplicatedType) next.hardware = "The same device ID cannot be assigned to two pots within one device type.";
    }
    setErrors(next);
    return !Object.keys(next).length;
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    let experimentId;
    try {
      const numericFrequencies = Object.fromEntries(Object.entries(frequencies).map(([id, value]) => [id, hoursToSeconds(value)]));
      const experimentResponse = await fetch(`${api}/experiments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, plant_name: plantName, description, keywords,
          sensor_set_id: Number(sensorSetId),
          measurement_frequency_seconds: Math.min(...Object.values(numericFrequencies)),
          sensor_frequencies: numericFrequencies,
          started_at: startDate, planned_end_at: endDate, finished_at: null,
          owner: null, collaborators: [], is_public: isPublic,
        }),
      });
      const experiment = await experimentResponse.json();
      if (!experimentResponse.ok) throw experiment;
      experimentId = experiment.id;

      const designResponse = await fetch(`${api}/experiments/${experimentId}/design/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factors,
          repetitions: Number(repetitions),
          selected_combinations: selected.map((combination) => Object.fromEntries(combination.map((item, index) => [factors[index].name, item.label]))),
          pot_assignments: pots.map(({ label }) => ({ label, ...hardware[label], is_monitored: Boolean(hardware[label]?.is_monitored) })),
          camera_assignments: cameras.filter((item) => item.camera_id && item.pot_label).map((item) => ({ ...item, camera_id: Number(item.camera_id) })),
        }),
      });
      const design = await designResponse.json();
      if (!designResponse.ok) throw design;
      toast.success("Experiment and pot layout created!");
      navigate("/dashboard");
    } catch (error) {
      if (experimentId) await fetch(`${api}/experiments/${experimentId}/delete/`, { method: "DELETE" });
      setErrors({ server: typeof error === "object" ? JSON.stringify(error) : String(error) });
      toast.error("The experiment could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const error = Object.values(errors)[0];
  return (
    <div className="dashboard-page">
      <Sidebar />
      <div className="dashboard-content">
        <TopBar />
        <main className="content-body">
          <div className="steps-progress-bar">{[1, 2, 3, 4, 5].map((number, index) => <React.Fragment key={number}>{index > 0 && <div className={`step-line ${step >= number ? "active" : ""}`} />}<div className={`step-circle ${step >= number ? "active" : ""}`}>{number}</div></React.Fragment>)}</div>
          <div className="form-card experiment-designer">
            {step === 1 && <div className="step-content">
              <div className="new-exp-form"><h2>Describe your experiment</h2></div>
              <div className="form-section"><p>Experiment name:</p><input value={name} onChange={(event) => setName(event.target.value)} /></div>
              <div className="form-section"><p>Plant species:</p><input value={plantName} onChange={(event) => setPlantName(event.target.value)} /></div>
              <div className="dates-choices"><div className="date-choice"><label>Start date:</label><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div><div className="date-choice"><label>Planned end date:</label><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div></div>
              <div className="form-section"><p>Description:</p><textarea rows="5" className="description-textarea" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
              <div className="form-section"><p>Keywords:</p><div className="keyword-input-wrapper"><input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} /><button className="btn-create" type="button" onClick={() => { const value = keywordInput.trim(); if (value && !keywords.includes(value)) { setKeywords([...keywords, value]); setKeywordInput(""); } }}>ADD</button></div><div className="keywords-tags-container">{keywords.map((item) => <span className="exp-keyword" key={item}>{item}<button className="btn-remove-tag" type="button" onClick={() => setKeywords(keywords.filter((value) => value !== item))}>&times;</button></span>)}</div></div>
            </div>}

            {step === 2 && <div className="step-content">
              <div className="new-exp-form"><h2>Define experimental factors</h2><p>Add every factor and mark its reference level.</p></div>
              {factors.map((factor, factorIndex) => <section className="factor-card" key={factorIndex}>
                <div className="designer-row"><input placeholder="Factor name, e.g. drought" value={factor.name} onChange={(event) => changeFactor(factorIndex, { name: event.target.value })} /><input placeholder="Unit (optional)" value={factor.unit} onChange={(event) => changeFactor(factorIndex, { unit: event.target.value })} />{factors.length > 1 && <button className="designer-remove" type="button" onClick={() => { setFactors(factors.filter((_, index) => index !== factorIndex)); setExcluded([]); }}>Remove factor</button>}</div>
                {factor.levels.map((item, levelIndex) => <div className="level-row" key={levelIndex}><input placeholder="Level name" value={item.label} onChange={(event) => changeLevel(factorIndex, levelIndex, { label: event.target.value })} /><input placeholder="Value (optional)" value={item.value} onChange={(event) => changeLevel(factorIndex, levelIndex, { value: event.target.value })} /><label><input type="radio" name={`reference-${factorIndex}`} checked={item.is_reference} onChange={() => changeLevel(factorIndex, levelIndex, { is_reference: true })} /> Reference</label>{factor.levels.length > 2 && <button className="designer-remove" type="button" onClick={() => { const levels = factor.levels.filter((_, index) => index !== levelIndex); if (!levels.some((value) => value.is_reference)) levels[0].is_reference = true; changeFactor(factorIndex, { levels }); }}>Remove</button>}</div>)}
                <button className="btn-back" type="button" onClick={() => changeFactor(factorIndex, { levels: [...factor.levels, level()] })}>+ Add level</button>
              </section>)}
              <button className="btn-create" type="button" onClick={() => setFactors([...factors, { name: "", unit: "", levels: [level("Control", true), level()] }])}>+ Add factor</button>
            </div>}

            {step === 3 && <div className="step-content">
              <div className="new-exp-form"><h2>Select combinations and repetitions</h2><p>All combinations are generated automatically. Deselect only those you do not need.</p></div>
              <div className="form-section compact-field"><label>Repetitions per combination:</label><input type="number" min="1" max="50" value={repetitions} onChange={(event) => setRepetitions(event.target.value)} /></div>
              <div className="combination-grid">{combinations.map((combination) => { const key = keyOf(combination); const enabled = !excluded.includes(key); return <label className={`combination-card ${enabled ? "selected" : ""}`} key={key}><input type="checkbox" checked={enabled} onChange={() => setExcluded(enabled ? [...excluded, key] : excluded.filter((item) => item !== key))} /><strong>{combination.every((item) => item.is_reference) ? "Reference combination" : "Treatment"}</strong>{combination.map((item, index) => <span key={index}>{factors[index].name}: {item.label}</span>)}</label>; })}</div>
              <h3>Pot layout ({pots.length})</h3><div className="pot-grid">{pots.map((pot) => <div className="pot-card" key={pot.label}><strong>{pot.label}</strong><small>rep. {pot.replicate}</small>{pot.combination.map((item, index) => <span key={index}>{factors[index].name}: {item.label}</span>)}</div>)}</div>
            </div>}

            {step === 4 && <div className="step-content">
              <div className="new-exp-form"><h2>Assign hardware</h2><p>Shared sensors belong to the hardware set. Only selected pots need individual sensors and a pump.</p></div>
              <section className="hardware-layout-preview">
                <div className="hardware-layout-preview-header">
                  <h3>Pot layout reference</h3>
                  <span>{pots.length} pot(s)</span>
                </div>
                <p>Use this plan to identify the pot numbers while assigning hardware.</p>
                <div className="pot-grid pot-grid--reference">{pots.map((pot) => <div className={`pot-card ${hardware[pot.label]?.is_monitored ? "monitored" : ""}`} key={pot.label}><strong>{pot.label}</strong><small>rep. {pot.replicate}</small>{pot.combination.map((item, index) => <span key={index}>{factors[index].name}: {item.label}</span>)}</div>)}</div>
              </section>
              <div className="form-section compact-field"><label>Hardware set ID:</label><input type="number" min="1" value={sensorSetId} onChange={(event) => setSensorSetId(event.target.value)} /></div>
              <h3>Reading frequency (hours)</h3><div className="frequency-grid">{SENSORS.map(([id, label, scope]) => <label key={id}><span>{label}<small>{scope}</small></span><input type="text" inputMode="decimal" placeholder="e.g. 0,3" value={frequencies[id]} onChange={(event) => setFrequencies({ ...frequencies, [id]: event.target.value })} /></label>)}</div>
              <h3>Individual pot hardware</h3>
              <p className="hardware-help">IDs are labels chosen by you for physical devices. The same number may be used for different device types, for example moisture sensor 1 and pump 1.</p>
              <div className="pot-assignment-list">{pots.map((pot) => { const assignment = hardware[pot.label] || {}; return <div className={`pot-assignment ${assignment.is_monitored ? "monitored" : ""}`} key={pot.label}><label className="monitor-toggle"><input type="checkbox" checked={Boolean(assignment.is_monitored)} onChange={(event) => changeHardware(pot.label, { is_monitored: event.target.checked })} /><strong>{pot.label}</strong><span className="pot-assignment-treatment">{pot.combination.map((item) => item.label).join(" · ")}</span><span>{assignment.is_monitored ? "monitored" : "not monitored"}</span></label>{assignment.is_monitored && <div className="designer-row hardware-fields"><label className="hardware-field"><span>Soil moisture sensor ID</span><input placeholder="e.g. 1" value={assignment.soil_moisture || ""} onChange={(event) => changeHardware(pot.label, { soil_moisture: event.target.value })} /></label><label className="hardware-field"><span>Soil temperature sensor ID</span><input placeholder="e.g. 1" value={assignment.soil_temperature || ""} onChange={(event) => changeHardware(pot.label, { soil_temperature: event.target.value })} /></label><label className="hardware-field"><span>Pump ID</span><input placeholder="e.g. 1" value={assignment.pump || ""} onChange={(event) => changeHardware(pot.label, { pump: event.target.value })} /></label></div>}</div>; })}</div>
              <h3>Camera assignment (optional)</h3>
              <p className="hardware-help">You may leave these fields empty. Camera device ID is the number visible next to the camera in Django admin.</p>
              {cameras.map((camera, index) => <div className="designer-row camera-row" key={index}><label className="hardware-field"><span>Camera {index + 1} device ID</span><input type="number" min="1" placeholder="e.g. 1" value={camera.camera_id} onChange={(event) => setCameras(cameras.map((item, current) => current === index ? { ...item, camera_id: event.target.value } : item))} /></label><label className="hardware-field"><span>Observed pot</span><select value={camera.pot_label} onChange={(event) => setCameras(cameras.map((item, current) => current === index ? { ...item, pot_label: event.target.value } : item))}><option value="">Select pot</option>{pots.map((pot) => <option key={pot.label}>{pot.label}</option>)}</select></label></div>)}
            </div>}

            {step === 5 && <div className="step-content">
              <div className="new-exp-form"><h2>Review and create</h2></div>
              <div className="design-summary"><p><strong>{name}</strong> — {plantName}</p><p>{factors.length} factor(s), {selected.length} combination(s), {pots.length} pot(s)</p><p>{Object.values(hardware).filter((item) => item.is_monitored).length} monitored pot(s), Hardware set ID: {sensorSetId}</p></div>
              <div className="is-public"><label><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} /> Make my experiment public and let other users see the data.</label></div>
            </div>}

            {error && <span className="error-text designer-error">{error}</span>}
            <div className="form-navigation designer-navigation"><button className="btn-back" onClick={() => step === 1 ? navigate("/dashboard") : setStep(step - 1)}>{step === 1 ? "CANCEL" : "BACK"}</button>{step < 5 ? <button className="btn-create" onClick={() => { if (validate()) setStep(step + 1); }}>NEXT</button> : <button className="btn-create" disabled={saving} onClick={save}>{saving ? "CREATING..." : "CREATE EXPERIMENT"}</button>}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default New_experiment;

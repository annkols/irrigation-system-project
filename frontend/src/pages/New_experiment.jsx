import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import LocalizedDateInput from "./LocalizedDateInput";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};
const SENSORS = [
  ["air_temperature", "airTemperature", "shared"],
  ["air_humidity", "airHumidity", "shared"],
  ["pressure", "pressure", "shared"],
  ["light", "light", "shared"],
  ["soil_moisture", "soilMoisture", "perPot"],
  ["soil_temperature", "soilTemperature", "perPot"],
];
const level = (label = "", reference = false) => ({ label, value: "", is_reference: reference });
const keyOf = (combination) => combination.map((item) => item.label).join("\u001f");
const parseHours = (value) => Number(String(value).trim().replace(",", "."));
const hoursToSeconds = (value) => Math.max(1, Math.round(parseHours(value) * 3600));
const cartesian = (lists) => lists.reduce(
  (rows, items) => rows.flatMap((row) => items.map((item) => [...row, item])),
  [[]],
);
const apiErrorMessage = (error, fallback) => {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) return error.map((item) => apiErrorMessage(item, fallback)).filter(Boolean).join(" ");
  if (error && typeof error === "object") {
    return Object.values(error).map((item) => apiErrorMessage(item, fallback)).filter(Boolean).join(" ");
  }
  return fallback;
};

function New_experiment() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const api = import.meta.env.VITE_API_URL;
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [collaboratorError, setCollaboratorError] = useState("");
  const [collaboratorSuggestions, setCollaboratorSuggestions] = useState([]);
  const [searchingCollaborators, setSearchingCollaborators] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [sensorSetId, setSensorSetId] = useState(1);
  const [frequencies, setFrequencies] = useState(Object.fromEntries(SENSORS.map(([id]) => [id, "1"])));
  const [factors, setFactors] = useState([{ name: "", unit: "", levels: [level(t("newExperiment.control"), true), level()] }]);
  const [repetitions, setRepetitions] = useState(1);
  const [excluded, setExcluded] = useState([]);
  const [hardware, setHardware] = useState({});
  const [cameras, setCameras] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const query = collaboratorEmail.trim();

    if (query.length < 2) {
      setCollaboratorSuggestions([]);
      setSearchingCollaborators(false);
      return;
    }

    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      setSearchingCollaborators(true);

      try {
        const response = await fetch(
          `${api}/users/search/?q=${encodeURIComponent(query)}`,
          { headers: getAuthHeaders() }
        );

        if (!response.ok) {
          throw new Error("User search failed");
        }

        const data = await response.json();
        const users = Array.isArray(data) ? data : data.results ?? [];
        const normalizedQuery = query.toLowerCase();

        const filteredUsers = users.filter((user) => {
          const email = (user.email ?? "").trim().toLowerCase();
          const username = (user.username ?? "").trim().toLowerCase();
          const userId = user.id ?? user.user_id;

          const matches =
            email.includes(normalizedQuery) ||
            username.includes(normalizedQuery);

          const alreadyAdded = collaborators.some(
            (item) => String(item.user_id) === String(userId)
          );

          return matches && userId != null && !alreadyAdded;
        });

        if (!cancelled) {
          setCollaboratorSuggestions(filteredUsers);
        }
      } catch (error) {
        if (!cancelled) {
          setCollaboratorSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingCollaborators(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [collaboratorEmail, collaborators, api]);

  const addCollaborator = async (selectedUser = null) => {
    const query = collaboratorEmail.trim();

    if (!selectedUser && !query) return;

    setAddingCollaborator(true);
    setCollaboratorError("");

    try {
      let user = selectedUser;

      if (!user) {
        const response = await fetch(
          `${api}/users/search/?q=${encodeURIComponent(query)}`,
          { headers: getAuthHeaders() }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(t("experimentDetails.lost_user"));
        }

        const users = Array.isArray(data) ? data : data.results ?? [];
        const normalizedQuery = query.toLowerCase();

        user = users.find((item) =>
          (item.email ?? "").trim().toLowerCase() === normalizedQuery ||
          (item.username ?? "").trim().toLowerCase() === normalizedQuery
        );
      }

      if (!user) {
        setCollaboratorError(t("experimentDetails.lost_user"));
        return;
      }

      const userId = user.id ?? user.user_id;

      if (userId == null) {
        setCollaboratorError(t("experimentDetails.lost_user"));
        return;
      }

      if (
        collaborators.some(
          (item) => String(item.user_id) === String(userId)
        )
      ) {
        setCollaboratorError(t("experimentDetails.already_user"));
        return;
      }

      setCollaborators((current) => [
        ...current,
        {
          user_id: userId,
          email: user.email ?? user.username ?? query,
          can_edit_experiment: true,
          can_end_experiment: false,
        },
      ]);

      setCollaboratorEmail("");
      setCollaboratorSuggestions([]);
    } catch (err) {
      console.error("Error adding collaborator:", err);
      setCollaboratorError(
        err.message || t("experimentDetails.lost_user")
      );
    } finally {
      setAddingCollaborator(false);
    }
  };

  const updateCollaboratorPermission = (userId, permission, checked) => {
    setCollaborators((current) =>
      current.map((item) =>
        String(item.user_id) === String(userId)
          ? { ...item, [permission]: checked }
          : item
      )
    );
  };

  const removeCollaborator = (userId) => {
    setCollaborators((current) =>
      current.filter((item) => item.user_id !== userId)
    );
  };

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

  const addCamera = () => {
    setCameras((items) => [
      ...items,
      { camera_id: "", pot_label: "", verification: "idle", camera_name: "" },
    ]);
  };

  const changeCamera = (index, patch) => {
    setCameras((items) => items.map((item, current) => (
      current === index ? { ...item, ...patch } : item
    )));
    setErrors((current) => ({ ...current, cameras: null }));
  };

  const removeCamera = (index) => {
    setCameras((items) => items.filter((_, current) => current !== index));
    setErrors((current) => ({ ...current, cameras: null }));
  };

  const verifyCamera = async (index) => {
    const camera = cameras[index];
    const cameraId = Number(camera?.camera_id);
    const hardwareSetId = Number(sensorSetId);
    if (!Number.isInteger(cameraId) || cameraId < 1 || !Number.isInteger(hardwareSetId) || hardwareSetId < 1) {
      changeCamera(index, { verification: "invalid", camera_name: "" });
      return;
    }

    changeCamera(index, { verification: "checking", camera_name: "" });
    try {
      const response = await fetch(
        `${api}/camera/devices/${cameraId}/validate/?sensor_set_id=${hardwareSetId}`,
        { headers: getAuthHeaders() },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.code || "camera_unavailable");
      changeCamera(index, { verification: "valid", camera_name: data.name || "" });
    } catch {
      changeCamera(index, { verification: "invalid", camera_name: "" });
    }
  };

  const validate = () => {
    const next = {};
    if (step === 1) {
      if (!name.trim()) next.name = t("newExperiment.validation.name");
      if (!plantName.trim()) next.plant = t("newExperiment.validation.plant");
      if (!startDate || !endDate) next.dates = t("newExperiment.validation.dates");
      if (startDate && endDate && new Date(endDate) < new Date(startDate)) next.dates = t("newExperiment.validation.dateOrder");
      if (!keywords.length) next.keywords = t("newExperiment.validation.keywords");
    }
    if (step === 2) {
      if (!factors.length) next.factors = t("newExperiment.validation.factor");
      factors.forEach((factor) => {
        if (!factor.name.trim() || factor.levels.length < 2 || factor.levels.some((item) => !item.label.trim())) next.factors = t("newExperiment.validation.factorDetails");
        if (factor.levels.filter((item) => item.is_reference).length !== 1) next.factors = t("newExperiment.validation.reference");
      });
    }
    if (step === 3) {
      if (!selected.length) next.plan = t("newExperiment.validation.combination");
      if (!Number.isInteger(Number(repetitions)) || Number(repetitions) < 1 || Number(repetitions) > 50) next.plan = t("newExperiment.validation.repetitions");
      if (pots.length > 500) next.plan = t("newExperiment.validation.potLimit");
    }
    if (step === 4) {
      if (!Number.isInteger(Number(sensorSetId)) || Number(sensorSetId) < 1) next.hardware = t("newExperiment.validation.hardware");
      if (SENSORS.some(([id]) => !Number.isFinite(parseHours(frequencies[id])) || parseHours(frequencies[id]) <= 0)) next.hardware = t("experimentForm.errors.frequency");
      const deviceTypes = ["soil_moisture", "soil_temperature", "pump"];
      const duplicatedType = deviceTypes.find((type) => {
        const identifiers = Object.values(hardware)
          .map((assignment) => assignment[type]?.trim().toLowerCase())
          .filter(Boolean);
        return new Set(identifiers).size !== identifiers.length;
      });
      if (duplicatedType) next.hardware = t("newExperiment.validation.duplicateDevice");
      const incompleteCamera = cameras.some((camera) => !camera.camera_id || !camera.pot_label);
      const cameraIds = cameras.map((camera) => String(camera.camera_id).trim()).filter(Boolean);
      if (incompleteCamera) next.cameras = t("newExperiment.validation.cameraIncomplete");
      else if (new Set(cameraIds).size !== cameraIds.length) next.cameras = t("newExperiment.validation.cameraDuplicate");
      else if (cameras.some((camera) => camera.verification !== "valid")) next.cameras = t("newExperiment.validation.cameraUnverified");
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
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name, plant_name: plantName, description, keywords,
          sensor_set_id: Number(sensorSetId),
          measurement_frequency_seconds: Math.min(...Object.values(numericFrequencies)),
          sensor_frequencies: numericFrequencies,
          started_at: startDate, planned_end_at: endDate, finished_at: null,
          owner: null,
          initial_collaborators: collaborators.map((collaborator) => ({
            user_id: collaborator.user_id,
            can_edit_experiment: collaborator.can_edit_experiment,
            can_end_experiment: collaborator.can_end_experiment,
          })), is_public: isPublic,
        }),
      });
      const experiment = await experimentResponse.json();
      if (!experimentResponse.ok) throw experiment;
      experimentId = experiment.id;

      const designResponse = await fetch(`${api}/experiments/${experimentId}/design/`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          factors,
          repetitions: Number(repetitions),
          selected_combinations: selected.map((combination) => Object.fromEntries(combination.map((item, index) => [factors[index].name, item.label]))),
          pot_assignments: pots.map(({ label }) => ({ label, ...hardware[label], is_monitored: Boolean(hardware[label]?.is_monitored) })),
          camera_assignments: cameras.map((item) => ({
            camera_id: Number(item.camera_id),
            pot_label: item.pot_label,
          })),
        }),
      });
      const design = await designResponse.json();
      if (!designResponse.ok) throw design;
      toast.success(t("newExperiment.created"));
      navigate("/dashboard");
    } catch (error) {
      if (experimentId) {
        await fetch(`${api}/experiments/${experimentId}/delete/`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
      }
      const serverMessage = error?.camera_assignments
        ? t("newExperiment.validation.cameraBackend")
        : apiErrorMessage(error, t("newExperiment.unexpectedError"));
      setErrors({ server: serverMessage });
      toast.error(t("newExperiment.createFailed"));
    } finally {
      setSaving(false);
    }
  };

  const error = Object.entries(errors).find(([key, value]) => key !== "cameras" && value)?.[1];
  return (
    <div className="dashboard-page">
      <Sidebar />
      <div className="dashboard-content">
        <TopBar />
        <main className="content-body">
          <div className="steps-progress-bar">{[1, 2, 3, 4, 5].map((number, index) => <React.Fragment key={number}>{index > 0 && <div className={`step-line ${step >= number ? "active" : ""}`} />}<div className={`step-circle ${step >= number ? "active" : ""}`}>{number}</div></React.Fragment>)}</div>
          <div className="form-card experiment-designer">
            {step === 1 && <div className="step-content">
              <div className="new-exp-form"><h2>{t("newExperiment.describe")}</h2></div>
              <div className="form-section"><p>{t("newExperiment.nameLabel")}</p><input value={name} onChange={(event) => setName(event.target.value)} /></div>
              <div className="form-section"><p>{t("newExperiment.plantSpecies")}</p><input value={plantName} onChange={(event) => setPlantName(event.target.value)} /></div>
              <div className="dates-choices"><div className="date-choice"><label>{t("experimentForm.startDate")}</label><LocalizedDateInput value={startDate} onChange={setStartDate} ariaLabel={t("experimentForm.startDate")} /></div><div className="date-choice"><label>{t("experimentForm.plannedEndDate")}</label><LocalizedDateInput value={endDate} onChange={setEndDate} ariaLabel={t("experimentForm.plannedEndDate")} /></div></div>
              <div className="form-section"><p>{t("newExperiment.descriptionLabel")}</p><textarea rows="5" className="description-textarea" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
              <div className="form-section"><p>{t("newExperiment.keywordsLabel")}</p><div className="keyword-input-wrapper"><input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} /><button className="btn-create" type="button" onClick={() => { const value = keywordInput.trim(); if (value && !keywords.includes(value)) { setKeywords([...keywords, value]); setKeywordInput(""); } }}>{t("newExperiment.addUpper")}</button></div><div className="keywords-tags-container">{keywords.map((item) => <span className="exp-keyword" key={item}>{item}<button className="btn-remove-tag" type="button" onClick={() => setKeywords(keywords.filter((value) => value !== item))}>&times;</button></span>)}</div></div>
              <div className="form-section collaborators-section">
                <p>{t("experimentDetails.collaborators")}</p>
                <div className="collaborator-search">
                  <div className="keyword-input-wrapper">
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder={t("newExperiment.enter_email")}
                      value={collaboratorEmail}
                      onChange={(event) => {
                        setCollaboratorEmail(event.target.value);
                        setCollaboratorError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();

                          if (collaboratorSuggestions.length > 0) {
                            addCollaborator(collaboratorSuggestions[0]);
                          } else {
                            addCollaborator();
                          }
                        }

                        if (event.key === "Escape") {
                          setCollaboratorSuggestions([]);
                        }
                      }}
                    />

                    <button
                      className="btn-create"
                      type="button"
                      onClick={() => addCollaborator()}
                      disabled={addingCollaborator || !collaboratorEmail.trim()}
                    >
                      {addingCollaborator
                        ? t("experimentForm.Adding")
                        : t("experimentForm.add")}
                    </button>
                  </div>

                  {collaboratorEmail.trim().length >= 2 &&
                    collaboratorSuggestions.length > 0 && (
                      <div className="collaborator-suggestions" role="listbox">
                        {collaboratorSuggestions.map((user) => (
                          <button
                            key={user.id ?? user.user_id}
                            type="button"
                            className="collaborator-suggestion"
                            role="option"
                            aria-selected="false"
                            onClick={() => addCollaborator(user)}
                            disabled={addingCollaborator}
                          >
                            <span className="collaborator-suggestion-avatar">
                              {(user.email ?? user.username ?? "?")
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <span className="collaborator-suggestion-info">
                              <strong>{user.email ?? user.username}</strong>

                              {user.email && user.username &&
                                user.email !== user.username && (
                                  <small>{user.username}</small>
                                )}
                            </span>

                            <span className="collaborator-suggestion-add">+</span>
                          </button>
                        ))}
                      </div>
                    )}

                  {searchingCollaborators && (
                    <p className="collaborator-search-status">
                      {t("newExperiment.peopleSearching")}
                    </p>
                  )}

                  {!searchingCollaborators &&
                    collaboratorEmail.trim().length >= 2 &&
                    collaboratorSuggestions.length === 0 &&
                    !collaboratorError && (
                      <p className="collaborator-search-status">
                        {t("newExperiment.UsersNotFound")}
                      </p>
                    )}
                </div>

                {collaboratorError && (
                  <p className="error-text">{collaboratorError}</p>
                )}

                <div className="collaborators-list">
                  {collaborators.map((collaborator) => (
                    <div
                      className="collaborator-item"
                      key={collaborator.user_id}
                    >
                      <div className="collaborator-details">
                        <strong>{collaborator.email}</strong>

                        <div className="collaborator-permissions">
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(
                                collaborator.can_edit_experiment
                              )}
                              onChange={(event) =>
                                updateCollaboratorPermission(
                                  collaborator.user_id,
                                  "can_edit_experiment",
                                  event.target.checked
                                )
                              }
                            />
                            {t("experimentForm.can_edit")}
                          </label>
                            {/*tu był przyciks który dawał permisje współpracownikom na usuwanie eksperymentu*/}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-remove-tag"
                        onClick={() =>
                          removeCollaborator(collaborator.user_id)
                        }
                        aria-label={`${t("experimentDetails.delete")} ${collaborator.email}`}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>}

            {step === 2 && <div className="step-content">
              <div className="new-exp-form"><h2>{t("newExperiment.defineFactors")}</h2><p>{t("newExperiment.factorHelp")}</p></div>
              {factors.map((factor, factorIndex) => <section className="factor-card" key={factorIndex}>
                <div className="designer-row"><input placeholder={t("newExperiment.factorPlaceholder")} value={factor.name} onChange={(event) => changeFactor(factorIndex, { name: event.target.value })} /><input placeholder={t("newExperiment.unitPlaceholder")} value={factor.unit} onChange={(event) => changeFactor(factorIndex, { unit: event.target.value })} />{factors.length > 1 && <button className="designer-remove" type="button" onClick={() => { setFactors(factors.filter((_, index) => index !== factorIndex)); setExcluded([]); }}>{t("newExperiment.removeFactor")}</button>}</div>
                {factor.levels.map((item, levelIndex) => <div className="level-row" key={levelIndex}><input placeholder={t("newExperiment.levelPlaceholder")} value={item.label} onChange={(event) => changeLevel(factorIndex, levelIndex, { label: event.target.value })} /><input placeholder={t("newExperiment.valuePlaceholder")} value={item.value} onChange={(event) => changeLevel(factorIndex, levelIndex, { value: event.target.value })} /><label><input type="radio" name={`reference-${factorIndex}`} checked={item.is_reference} onChange={() => changeLevel(factorIndex, levelIndex, { is_reference: true })} /> {t("newExperiment.reference")}</label>{factor.levels.length > 2 && <button className="designer-remove" type="button" onClick={() => { const levels = factor.levels.filter((_, index) => index !== levelIndex); if (!levels.some((value) => value.is_reference)) levels[0].is_reference = true; changeFactor(factorIndex, { levels }); }}>{t("newExperiment.remove")}</button>}</div>)}
                <button className="btn-back" type="button" onClick={() => changeFactor(factorIndex, { levels: [...factor.levels, level()] })}>{t("newExperiment.addLevel")}</button>
              </section>)}
              <button className="btn-create" type="button" onClick={() => setFactors([...factors, { name: "", unit: "", levels: [level(t("newExperiment.control"), true), level()] }])}>{t("newExperiment.addFactor")}</button>
            </div>}

            {step === 3 && <div className="step-content">
              <div className="new-exp-form"><h2>{t("newExperiment.selectCombinations")}</h2><p className="designer-help">{t("newExperiment.combinationsHelp")}</p></div>
              <div className="form-section compact-field"><label>{t("newExperiment.repetitions")}</label><input type="number" min="1" max="50" value={repetitions} onChange={(event) => setRepetitions(event.target.value)} /></div>
              <div className="combination-grid">{combinations.map((combination) => { const key = keyOf(combination); const enabled = !excluded.includes(key); return <label className={`combination-card ${enabled ? "selected" : ""}`} key={key}><input type="checkbox" checked={enabled} onChange={() => setExcluded(enabled ? [...excluded, key] : excluded.filter((item) => item !== key))} /><strong>{combination.every((item) => item.is_reference) ? t("newExperiment.referenceCombination") : t("newExperiment.treatment")}</strong>{combination.map((item, index) => <span key={index}>{factors[index].name}: {item.label}</span>)}</label>; })}</div>
              <h3>{t("newExperiment.potLayout", { count: pots.length })}</h3><div className="pot-grid">{pots.map((pot) => <div className="pot-card" key={pot.label}><strong>{pot.label}</strong><small>{t("newExperiment.replicate", { number: pot.replicate })}</small>{pot.combination.map((item, index) => <span key={index}>{factors[index].name}: {item.label}</span>)}</div>)}</div>
            </div>}

            {step === 4 && <div className="step-content">
              <div className="new-exp-form"><h2>{t("newExperiment.assignHardware")}</h2><p>{t("newExperiment.hardwareHelp")}</p></div>
              <section className="hardware-layout-preview">
                <div className="hardware-layout-preview-header">
                  <h3>{t("newExperiment.layoutReference")}</h3>
                  <span>{t("newExperiment.potCount", { count: pots.length })}</span>
                </div>
                <p>{t("newExperiment.layoutHelp")}</p>
                <div className="pot-grid pot-grid--reference">{pots.map((pot) => <div className={`pot-card ${hardware[pot.label]?.is_monitored ? "monitored" : ""}`} key={pot.label}><strong>{pot.label}</strong><small>{t("newExperiment.replicate", { number: pot.replicate })}</small>{pot.combination.map((item, index) => <span key={index}>{factors[index].name}: {item.label}</span>)}</div>)}</div>
              </section>
              <div className="form-section compact-field"><label>{t("experimentForm.hardwareSetId")}</label><input type="number" min="1" value={sensorSetId} onChange={(event) => { setSensorSetId(event.target.value); setCameras((items) => items.map((item) => ({ ...item, verification: "idle", camera_name: "" }))); }} /></div>
              <h3>{t("experimentForm.frequencyTitle")}</h3><div className="frequency-grid">{SENSORS.map(([id, labelKey, scopeKey]) => <label key={id}><span>{t(`experimentForm.sensors.${labelKey}`)}<small>{t(`experimentForm.sensors.${scopeKey}`)}</small></span><input type="text" inputMode="decimal" placeholder={t("experimentForm.exampleDecimal")} value={frequencies[id]} onChange={(event) => setFrequencies({ ...frequencies, [id]: event.target.value })} /></label>)}</div>
              <h3>{t("newExperiment.individualHardware")}</h3>
              <p className="hardware-help">{t("newExperiment.deviceIdHelp")}</p>
              <div className="pot-assignment-list">{pots.map((pot) => { const assignment = hardware[pot.label] || {}; return <div className={`pot-assignment ${assignment.is_monitored ? "monitored" : ""}`} key={pot.label}><label className="monitor-toggle"><input type="checkbox" checked={Boolean(assignment.is_monitored)} onChange={(event) => changeHardware(pot.label, { is_monitored: event.target.checked })} /><strong>{pot.label}</strong><span className="pot-assignment-treatment">{pot.combination.map((item) => item.label).join(" · ")}</span><span>{assignment.is_monitored ? t("newExperiment.monitored") : t("newExperiment.notMonitored")}</span></label>{assignment.is_monitored && <div className="designer-row hardware-fields"><label className="hardware-field"><span>{t("newExperiment.soilMoistureId")}</span><input placeholder={t("newExperiment.exampleId")} value={assignment.soil_moisture || ""} onChange={(event) => changeHardware(pot.label, { soil_moisture: event.target.value })} /></label><label className="hardware-field"><span>{t("newExperiment.soilTemperatureId")}</span><input placeholder={t("newExperiment.exampleId")} value={assignment.soil_temperature || ""} onChange={(event) => changeHardware(pot.label, { soil_temperature: event.target.value })} /></label><label className="hardware-field"><span>{t("newExperiment.pumpId")}</span><input placeholder={t("newExperiment.exampleId")} value={assignment.pump || ""} onChange={(event) => changeHardware(pot.label, { pump: event.target.value })} /></label></div>}</div>; })}</div>
              <h3>{t("newExperiment.cameraAssignment")}</h3>
              <p className="hardware-help">{t("newExperiment.cameraHelp")}</p>
              {!cameras.length && <p className="camera-empty-state">{t("newExperiment.noCameras")}</p>}
              <div className="camera-assignment-list">
                {cameras.map((camera, index) => (
                  <div className="designer-row camera-row" key={index}>
                    <label className="hardware-field">
                      <span>{t("newExperiment.cameraDevice", { number: index + 1 })}</span>
                      <input
                        type="number"
                        min="1"
                        placeholder={t("newExperiment.exampleId")}
                        value={camera.camera_id}
                        onChange={(event) => changeCamera(index, { camera_id: event.target.value, verification: "idle", camera_name: "" })}
                      />
                    </label>
                    <label className="hardware-field">
                      <span>{t("newExperiment.observedPot")}</span>
                      <select value={camera.pot_label} onChange={(event) => changeCamera(index, { pot_label: event.target.value })}>
                        <option value="">{t("newExperiment.selectPot")}</option>
                        {pots.map((pot) => <option key={pot.label}>{pot.label}</option>)}
                      </select>
                    </label>
                    <div className="camera-row-actions">
                      <button className="camera-verify-btn" type="button" onClick={() => verifyCamera(index)} disabled={camera.verification === "checking" || !camera.camera_id}>
                        {camera.verification === "checking" ? t("newExperiment.cameraChecking") : t("newExperiment.cameraVerify")}
                      </button>
                      <button className="designer-remove" type="button" onClick={() => removeCamera(index)}>{t("newExperiment.removeCamera")}</button>
                    </div>
                    {camera.verification === "valid" && <span className="camera-verification camera-verification--valid">{t("newExperiment.cameraVerified", { name: camera.camera_name })}</span>}
                    {camera.verification === "invalid" && <span className="camera-verification camera-verification--invalid">{t("newExperiment.cameraNotFound")}</span>}
                  </div>
                ))}
              </div>
              <button className="btn-back camera-add-btn" type="button" onClick={addCamera}>{t("newExperiment.addCamera")}</button>
              {errors.cameras && <span className="error-text designer-error">{errors.cameras}</span>}
            </div>}

            {step === 5 && <div className="step-content">
              <div className="new-exp-form"><h2>{t("newExperiment.review")}</h2></div>
              <div className="design-summary"><p><strong>{name}</strong> — {plantName}</p><p>{t("newExperiment.summaryCounts", { factors: factors.length, combinations: selected.length, pots: pots.length })}</p><p>{t("newExperiment.summaryHardware", { count: Object.values(hardware).filter((item) => item.is_monitored).length, id: sensorSetId })}</p></div>
              <div className="is-public"><label><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} /> {t("experimentForm.makePublic")}</label></div>
            </div>}

            {error && <span className="error-text designer-error">{error}</span>}
            <div className="form-navigation designer-navigation"><button className="btn-back" onClick={() => step === 1 ? navigate("/dashboard") : setStep(step - 1)}>{step === 1 ? t("experimentForm.cancel").toUpperCase() : t("experimentForm.back").toUpperCase()}</button>{step < 5 ? <button className="btn-create" onClick={() => { if (validate()) setStep(step + 1); }}>{t("experimentForm.next").toUpperCase()}</button> : <button className="btn-create" disabled={saving} onClick={save}>{saving ? t("newExperiment.creating") : t("newExperiment.create")}</button>}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default New_experiment;

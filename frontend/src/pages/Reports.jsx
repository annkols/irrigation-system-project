import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";
import { buildChartSeries, findSharedSensorSource } from "./chartDataUtils";
import { renderLineChartImage } from "./reportChart";
import {
  addCoverTitle,
  addEmptyNote,
  addImage,
  addKeyValueList,
  addParagraph,
  addSectionHeading,
  addSubheading,
  addTable,
  createReport,
  savePdf,
} from "./reportPdf";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const SECTION_DEFS = [
  { key: "details", label: "Experiment details", icon: "info", description: "Plant type, description, keywords, dates, collaborators." },
  { key: "sensors", label: "Sensor readings", icon: "sensors", description: "Latest reading from every sensor, per pot." },
  { key: "charts", label: "Charts", icon: "bar_chart", description: "Soil moisture per pot and shared air temperature over time." },
  { key: "camera", label: "Camera view", icon: "videocam", description: "Latest camera frame for every monitored pot." },
  { key: "notes", label: "Notes", icon: "edit_note", description: "Timeline observations, with the first attached photo." },
];

const latestNonNull = (rows) => (rows.length
  ? rows.reduceRight((result, row) => ({
    ...result,
    ...Object.fromEntries(Object.entries(row).filter(([, value]) => value != null)),
  }), {})
  : null);

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const responseToDataUrl = (response) => new Promise((resolve, reject) => {
  response.blob().then((blob) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }).catch(reject);
});

export default function Reports() {
  const navigate = useNavigate();

  const [experiments, setExperiments] = useState([]);
  const [loadingExperiments, setLoadingExperiments] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [sections, setSections] = useState(
    Object.fromEntries(SECTION_DEFS.map((section) => [section.key, true]))
  );
  const [generating, setGenerating] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const headers = authHeaders();
    Promise.all([
      fetch(`${API_BASE_URL}/experiments/owned/`, { headers }),
      fetch(`${API_BASE_URL}/experiments/collaborated/`, { headers }),
    ])
      .then(async ([ownedRes, collabRes]) => {
        if (ownedRes.status === 401 || collabRes.status === 401) {
          localStorage.removeItem("token");
          navigate("/", { state: { showLogin: true } });
          return;
        }
        const owned = ownedRes.ok ? await ownedRes.json() : [];
        const collaborated = collabRes.ok ? await collabRes.json() : [];
        const merged = [...(Array.isArray(owned) ? owned : []), ...(Array.isArray(collaborated) ? collaborated : [])];
        const unique = [...new Map(merged.map((experiment) => [experiment.id, experiment])).values()];
        unique.sort((a, b) => a.name.localeCompare(b.name));
        setExperiments(unique);
        if (unique.length) setSelectedId(String(unique[0].id));
      })
      .catch(() => toast.error("Could not load your experiments."))
      .finally(() => setLoadingExperiments(false));

    fetch(`${API_BASE_URL}/auth/me/`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, [navigate]);

  const selectedExperiment = useMemo(
    () => experiments.find((experiment) => String(experiment.id) === selectedId) || null,
    [experiments, selectedId]
  );

  const toggleSection = (key) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const allSectionsOff = SECTION_DEFS.every((section) => !sections[section.key]);

  const generateReport = async () => {
    if (!selectedExperiment) return;
    setGenerating(true);
    const headers = authHeaders();

    try {
      const [expRes, designRes] = await Promise.all([
        fetch(`${API_BASE_URL}/experiments/${selectedExperiment.id}/`, { headers }),
        fetch(`${API_BASE_URL}/experiments/${selectedExperiment.id}/design/`, { headers }),
      ]);
      if (!expRes.ok) throw new Error("Could not load experiment details.");
      const experiment = await expRes.json();
      const design = designRes.ok ? await designRes.json() : null;

      const needsMeasurements = sections.sensors || sections.charts;
      const measurements = needsMeasurements
        ? await fetch(`${API_BASE_URL}/measurements/?experiment_id=${experiment.id}`, { headers })
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => (Array.isArray(data) ? data : []))
        : [];

      const collaborators = sections.details
        ? await fetch(`${API_BASE_URL}/experiments/${experiment.id}/collaborators/`, { headers })
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => (Array.isArray(data) ? data : []))
        : [];

      const notes = sections.notes
        ? await fetch(`${API_BASE_URL}/experiments/${experiment.id}/notes/`, { headers })
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => (Array.isArray(data) ? data : []))
        : [];

      const potNumbers = [...new Set(
        experiment.pot_numbers?.length ? experiment.pot_numbers : measurements.map((m) => m.pot_number)
      )].filter((n) => n != null).sort((a, b) => a - b);

      const cameraPotNumbers = (() => {
        if (!design?.camera_assignments?.length) return [];
        const positionsById = new Map(design.pots.map((pot) => [pot.id, pot.position]));
        return [...new Set(
          design.camera_assignments.map((assignment) => positionsById.get(assignment.pot_id)).filter((p) => p != null)
        )].sort((a, b) => a - b);
      })();

      let cameraImages = [];
      if (sections.camera) {
        cameraImages = await Promise.all(cameraPotNumbers.map(async (potNumber) => {
          try {
            const res = await fetch(
              `${API_BASE_URL}/experiments/${experiment.id}/frames/latest/image/?pot_number=${potNumber}`,
              { headers }
            );
            if (!res.ok) return { potNumber, dataUrl: null };
            return { potNumber, dataUrl: await responseToDataUrl(res) };
          } catch {
            return { potNumber, dataUrl: null };
          }
        }));
      }

      let noteThumbnails = new Map();
      if (sections.notes) {
        const entries = await Promise.all(
          notes
            .filter((note) => note.images?.length)
            .map(async (note) => {
              try {
                const res = await fetch(note.images[0].image_url, { headers });
                if (!res.ok) return [note.id, null];
                return [note.id, await responseToDataUrl(res)];
              } catch {
                return [note.id, null];
              }
            })
        );
        noteThumbnails = new Map(entries);
      }

      buildPdf({
        experiment,
        design,
        collaborators,
        measurements,
        notes,
        noteThumbnails,
        potNumbers,
        cameraPotNumbers,
        cameraImages,
        sections,
        generatedBy: currentUser
          ? (currentUser.first_name && currentUser.last_name
            ? `${currentUser.first_name} ${currentUser.last_name}`
            : currentUser.username || currentUser.email)
          : null,
      });

      toast.success("Report generated.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to generate the report.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="dashboard-page">
      <Sidebar />
      <div className="dashboard-content">
        <TopBar />

        <header className="dashboard-header">
          <h1>Reports</h1>
        </header>

        {loadingExperiments ? (
          <div className="loading">Loading...</div>
        ) : experiments.length === 0 ? (
          <div className="exp-empty-state">
            <span className="material-symbols-outlined">description</span>
            <p>You don't have any experiments yet — create one first.</p>
          </div>
        ) : (
          <div className="reports-body">
            <div className="exp-overview-card reports-picker-card">
              <div className="exp-overview-field">
                <label className="exp-info-label" htmlFor="report-experiment">Experiment</label>
                <select
                  id="report-experiment"
                  className="exp-edit-input"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {experiments.map((experiment) => (
                    <option key={experiment.id} value={experiment.id}>
                      {experiment.name}{experiment.plant_name ? ` — ${experiment.plant_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="exp-overview-field exp-overview-field--last">
                <span className="exp-info-label">Sections to include</span>
                <div className="reports-section-list">
                  {SECTION_DEFS.map((section) => (
                    <label key={section.key} className="reports-section-item">
                      <input
                        type="checkbox"
                        checked={sections[section.key]}
                        onChange={() => toggleSection(section.key)}
                      />
                      <span className="material-symbols-outlined">{section.icon}</span>
                      <span className="reports-section-text">
                        <strong>{section.label}</strong>
                        <small>{section.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="reports-generate-row">
              <button
                className="exp-btn exp-btn--primary"
                disabled={generating || allSectionsOff || !selectedExperiment}
                onClick={generateReport}
              >
                <span className="material-symbols-outlined">picture_as_pdf</span>
                {generating ? "Generating…" : "Generate PDF"}
              </button>
              {allSectionsOff && <span className="error-text">Select at least one section.</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildPdf({
  experiment, design, collaborators, measurements, notes, noteThumbnails,
  potNumbers, cameraPotNumbers, cameraImages, sections, generatedBy,
}) {
  const ctx = createReport();
  const generatedAt = new Date().toLocaleString("pl-PL", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  addCoverTitle(ctx, {
    title: "Experiment Report",
    experimentName: experiment.name,
    generatedAt,
    generatedBy,
  });

  if (sections.details) {
    addSectionHeading(ctx, "Experiment details");
    addKeyValueList(ctx, [
      ["Plant type", experiment.plant_name || "-"],
      ["Status", experiment.is_public ? "Public" : "Private"],
      ["Start date", formatDate(experiment.started_at)],
      ["Planned end date", formatDate(experiment.planned_end_at)],
      ["End date", formatDate(experiment.finished_at)],
      ["Keywords", experiment.keywords?.length ? experiment.keywords.join(", ") : "-"],
      ["Collaborators", collaborators.length
        ? collaborators.map((c) => c.user?.first_name && c.user?.last_name
          ? `${c.user.first_name} ${c.user.last_name}`
          : c.user?.username).filter(Boolean).join(", ") || "-"
        : "None"],
    ]);
    if (experiment.description) {
      addSubheading(ctx, "Description");
      addParagraph(ctx, experiment.description);
    }
    if (design?.pots?.length) {
      addSubheading(ctx, `Experimental layout (${design.pots.length} pot(s))`);
      addTable(ctx, {
        columns: [
          { header: "Pot", width: 25 },
          { header: "Replicate", width: 25 },
          { header: "Treatment", width: 80 },
          { header: "Monitoring", width: 50 },
        ],
        rows: design.pots.map((pot) => [
          pot.label,
          pot.replicate_number,
          pot.treatment_levels.map((t) => `${t.factor}: ${t.level}`).join(", ") || "-",
          pot.is_monitored ? "Monitored" : "Manual",
        ]),
      });
    }
  }

  if (sections.sensors) {
    addSectionHeading(ctx, "Sensor readings");
    const stationMeasurements = measurements;
    if (!stationMeasurements.length) {
      addEmptyNote(ctx, "No measurements recorded yet.");
    } else {
      const shared = latestNonNull(stationMeasurements);
      addSubheading(ctx, "Shared sensors (station-wide)");
      addKeyValueList(ctx, [
        ["Air temperature", shared?.air_temperature != null ? `${shared.air_temperature} °C` : "-"],
        ["Air humidity", shared?.air_humidity != null ? `${shared.air_humidity} %` : "-"],
        ["Light intensity", shared?.light_lux != null ? `${shared.light_lux} lx` : "-"],
        ["Pressure", shared?.pressure_hpa != null ? `${shared.pressure_hpa} hPa` : "-"],
      ]);

      potNumbers.forEach((potNumber) => {
        const potMeasurements = stationMeasurements.filter((m) => m.pot_number === potNumber);
        addSubheading(ctx, `P${potNumber} — sensor readings (${potMeasurements.length})`);
        if (!potMeasurements.length) {
          addEmptyNote(ctx, "No measurements recorded for this pot.");
          return;
        }
        addTable(ctx, {
          columns: [
            { header: "Date & time", width: 34 },
            { header: "Air T (°C)", width: 20 },
            { header: "Moist (%)", width: 22 },
            { header: "Hum (%)", width: 20 },
            { header: "Light (lx)", width: 18 },
            { header: "Soil T (°C)", width: 22 },
            { header: "Press (hPa)", width: 22 },
            { header: "Pump", width: 16 },
          ],
          rows: potMeasurements.map((m) => [
            m.created_at ? new Date(m.created_at).toLocaleString("pl-PL", {
              day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
            }) : "-",
            m.air_temperature ?? "-",
            m.moisture_percent ?? "-",
            m.air_humidity ?? "-",
            m.light_lux ?? "-",
            m.soil_temperature ?? "-",
            m.pressure_hpa ?? "-",
            m.pump_on != null ? (m.pump_on ? "ON" : "OFF") : "-",
          ]),
        });
      });
    }
  }

  if (sections.charts) {
    addSectionHeading(ctx, "Charts");
    if (!measurements.length) {
      addEmptyNote(ctx, "No measurements available to plot.");
    } else {
      const sharedTempPot = findSharedSensorSource(measurements, "air_temperature");
      if (sharedTempPot != null) {
        const series = buildChartSeries({
          measurements,
          valueKey: "air_temperature",
          predicate: (m) => m.pot_number === sharedTempPot,
        });
        addImage(ctx, {
          dataUrl: renderLineChartImage({ points: series, title: "Air temperature (°C, shared)", color: "#006D3D" }),
          maxHeight: 78,
        });
      }
      potNumbers.forEach((potNumber) => {
        const series = buildChartSeries({
          measurements,
          valueKey: "moisture_percent",
          predicate: (m) => m.pot_number === potNumber,
        });
        if (series.some((point) => point.value != null)) {
          addImage(ctx, {
            dataUrl: renderLineChartImage({ points: series, title: `Soil moisture % — P${potNumber}`, color: "#ff7b00" }),
            maxHeight: 78,
          });
        }
      });
    }
  }

  if (sections.camera) {
    addSectionHeading(ctx, "Camera view");
    if (!cameraPotNumbers.length) {
      addEmptyNote(ctx, "No camera assigned to this experiment.");
    } else {
      cameraImages.forEach(({ potNumber, dataUrl }) => {
        if (dataUrl) {
          addImage(ctx, { dataUrl, caption: `Latest frame — P${potNumber}`, maxHeight: 95, maxWidth: 90 });
        } else {
          addEmptyNote(ctx, `P${potNumber}: no saved frame available.`);
        }
      });
    }
  }

  if (sections.notes) {
    addSectionHeading(ctx, "Notes");
    if (!notes.length) {
      addEmptyNote(ctx, "No notes recorded for this experiment.");
    } else {
      notes.forEach((note) => {
        addSubheading(ctx, `${note.title} — ${new Date(note.created_at).toLocaleString("pl-PL")}`);
        if (note.content) addParagraph(ctx, note.content);
        const thumbnail = noteThumbnails.get(note.id);
        if (thumbnail) {
          addImage(ctx, {
            dataUrl: thumbnail,
            caption: note.images.length > 1 ? `+${note.images.length - 1} more photo(s) attached` : null,
            maxWidth: 60,
            maxHeight: 45,
          });
        }
      });
    }
  }

  const safeName = experiment.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  savePdf(ctx, `report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pl-PL");
}

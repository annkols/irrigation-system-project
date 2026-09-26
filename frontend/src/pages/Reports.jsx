import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";
import { buildChartSeries, findSharedSensorSource } from "./chartDataUtils";
import { renderLineChartImage } from "./reportChart";
import { useTranslation } from "react-i18next";
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
  { key: "details", labelKey: "reports.sections.details", icon: "info", descriptionKey: "reports.sections.detailsDescription" },
  { key: "sensors", labelKey: "reports.sections.sensors", icon: "sensors", descriptionKey: "reports.sections.sensorsDescription" },
  { key: "charts", labelKey: "reports.sections.charts", icon: "bar_chart", descriptionKey: "reports.sections.chartsDescription" },
  { key: "camera", labelKey: "reports.sections.camera", icon: "videocam", descriptionKey: "reports.sections.cameraDescription" },
  { key: "notes", labelKey: "reports.sections.notes", icon: "edit_note", descriptionKey: "reports.sections.notesDescription" },
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
  const { t, i18n } = useTranslation();
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
      .catch(() => toast.error(t('reports.errors.loadExperiments')))
      .finally(() => setLoadingExperiments(false));

    fetch(`${API_BASE_URL}/auth/me/`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, [navigate, t]);

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
      if (!expRes.ok) throw new Error(t('reports.errors.loadDetails'));
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
        t,
        locale: i18n.resolvedLanguage,
      });

      toast.success(t('reports.generated'));
    } catch (err) {
      console.error(err);
      toast.error(err.message || t('reports.errors.generate'));
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
          <h1>{t('reports.title')}</h1>
        </header>

        {loadingExperiments ? (
          <div className="loading">{t('common.loading')}</div>
        ) : experiments.length === 0 ? (
          <div className="exp-empty-state">
            <span className="material-symbols-outlined">description</span>
            <p>{t('reports.noExperiments')}</p>
          </div>
        ) : (
          <div className="reports-body">
            <div className="exp-overview-card reports-picker-card">
              <div className="exp-overview-field">
                <label className="exp-info-label" htmlFor="report-experiment">{t('experimentForm.experiment')}</label>
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
                <span className="exp-info-label">{t('reports.sectionsToInclude')}</span>
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
                        <strong>{t(section.labelKey)}</strong>
                        <small>{t(section.descriptionKey)}</small>
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
                {generating ? t('reports.generating') : t('reports.generatePdf')}
              </button>
              {allSectionsOff && <span className="error-text">{t('reports.selectSection')}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildPdf({
  experiment, design, collaborators, measurements, notes, noteThumbnails,
  potNumbers, cameraPotNumbers, cameraImages, sections, generatedBy, t, locale,
}) {
  const ctx = createReport();
  const generatedAt = new Date().toLocaleString(locale, {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  addCoverTitle(ctx, {
    title: t('reports.pdf.title'),
    experimentName: experiment.name,
    generatedAt,
    generatedBy,
  });

  if (sections.details) {
    addSectionHeading(ctx, t('reports.sections.details'));
    addKeyValueList(ctx, [
      [t('experimentForm.plant'), experiment.plant_name || "-"],
      [t('experimentDetails.status'), experiment.is_public ? t('experimentForm.public') : t('experimentForm.private')],
      [t('experimentForm.startDate'), formatDate(experiment.started_at, locale)],
      [t('experimentForm.plannedEndDate'), formatDate(experiment.planned_end_at, locale)],
      [t('experimentDetails.endDate'), formatDate(experiment.finished_at, locale)],
      [t('experimentForm.keywords'), experiment.keywords?.length ? experiment.keywords.join(", ") : "-"],
      [t('experimentDetails.collaborators'), collaborators.length
        ? collaborators.map((c) => c.user?.first_name && c.user?.last_name
          ? `${c.user.first_name} ${c.user.last_name}`
          : c.user?.username).filter(Boolean).join(", ") || "-"
        : t('experimentDetails.none')],
    ]);
    if (experiment.description) {
      addSubheading(ctx, t('experimentForm.description'));
      addParagraph(ctx, experiment.description);
    }
    if (design?.pots?.length) {
      addSubheading(ctx, t('reports.pdf.layout', { count: design.pots.length }));
      addTable(ctx, {
        columns: [
          { header: t('experimentDetails.pot'), width: 25 },
          { header: t('reports.pdf.replicate'), width: 25 },
          { header: t('newExperiment.treatment'), width: 80 },
          { header: t('reports.pdf.monitoring'), width: 50 },
        ],
        rows: design.pots.map((pot) => [
          pot.label,
          pot.replicate_number,
          pot.treatment_levels.map((t) => `${t.factor}: ${t.level}`).join(", ") || "-",
          pot.is_monitored ? t('newExperiment.monitored') : t('experimentDetails.manual'),
        ]),
      });
    }
  }

  if (sections.sensors) {
    addSectionHeading(ctx, t('reports.sections.sensors'));
    const stationMeasurements = measurements;
    if (!stationMeasurements.length) {
      addEmptyNote(ctx, t('experimentDetails.noMeasurements'));
    } else {
      const shared = latestNonNull(stationMeasurements);
      addSubheading(ctx, t('reports.pdf.sharedSensors'));
      addKeyValueList(ctx, [
        [t('experimentForm.sensors.airTemperature'), shared?.air_temperature != null ? `${shared.air_temperature} °C` : "-"],
        [t('experimentForm.sensors.airHumidity'), shared?.air_humidity != null ? `${shared.air_humidity} %` : "-"],
        [t('experimentForm.sensors.light'), shared?.light_lux != null ? `${shared.light_lux} lx` : "-"],
        [t('experimentForm.sensors.pressure'), shared?.pressure_hpa != null ? `${shared.pressure_hpa} hPa` : "-"],
      ]);

      potNumbers.forEach((potNumber) => {
        const potMeasurements = stationMeasurements.filter((m) => m.pot_number === potNumber);
        addSubheading(ctx, t('reports.pdf.potReadings', { pot: potNumber, count: potMeasurements.length }));
        if (!potMeasurements.length) {
          addEmptyNote(ctx, t('reports.pdf.noPotMeasurements'));
          return;
        }
        addTable(ctx, {
          columns: [
            { header: t('experimentDetails.dateTime'), width: 34 },
            { header: t('reports.pdf.airT'), width: 20 },
            { header: t('reports.pdf.moisture'), width: 22 },
            { header: t('reports.pdf.humidity'), width: 20 },
            { header: t('reports.pdf.light'), width: 18 },
            { header: t('reports.pdf.soilT'), width: 22 },
            { header: t('reports.pdf.pressure'), width: 22 },
            { header: t('experimentDetails.pump'), width: 16 },
          ],
          rows: potMeasurements.map((m) => [
            m.created_at ? new Date(m.created_at).toLocaleString(locale, {
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
    addSectionHeading(ctx, t('reports.sections.charts'));
    if (!measurements.length) {
      addEmptyNote(ctx, t('reports.pdf.noChartData'));
    } else {
      const sharedTempPot = findSharedSensorSource(measurements, "air_temperature");
      if (sharedTempPot != null) {
        const series = buildChartSeries({
          measurements,
          valueKey: "air_temperature",
          predicate: (m) => m.pot_number === sharedTempPot,
        });
        addImage(ctx, {
          dataUrl: renderLineChartImage({ points: series, title: t('reports.pdf.sharedAirTemperature'), color: "#006D3D", locale, insufficientData: t('reports.pdf.notEnoughData') }),
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
            dataUrl: renderLineChartImage({ points: series, title: t('reports.pdf.soilMoistureChart', { pot: potNumber }), color: "#ff7b00", locale, insufficientData: t('reports.pdf.notEnoughData') }),
            maxHeight: 78,
          });
        }
      });
    }
  }

  if (sections.camera) {
    addSectionHeading(ctx, t('reports.sections.camera'));
    if (!cameraPotNumbers.length) {
      addEmptyNote(ctx, t('reports.pdf.noCamera'));
    } else {
      cameraImages.forEach(({ potNumber, dataUrl }) => {
        if (dataUrl) {
          addImage(ctx, { dataUrl, caption: t('reports.pdf.latestFrame', { pot: potNumber }), maxHeight: 95, maxWidth: 90 });
        } else {
          addEmptyNote(ctx, t('reports.pdf.noFrame', { pot: potNumber }));
        }
      });
    }
  }

  if (sections.notes) {
    addSectionHeading(ctx, t('reports.sections.notes'));
    if (!notes.length) {
      addEmptyNote(ctx, t('reports.pdf.noNotes'));
    } else {
      notes.forEach((note) => {
        addSubheading(ctx, `${note.title} — ${new Date(note.created_at).toLocaleString(locale)}`);
        if (note.content) addParagraph(ctx, note.content);
        const thumbnail = noteThumbnails.get(note.id);
        if (thumbnail) {
          addImage(ctx, {
            dataUrl: thumbnail,
            caption: note.images.length > 1 ? t('reports.pdf.morePhotos', { count: note.images.length - 1 }) : null,
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

function formatDate(value, locale) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(locale);
}

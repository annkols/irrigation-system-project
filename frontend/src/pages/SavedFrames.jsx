import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import "../App.css";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";
import { useTranslation } from "react-i18next";


const API_BASE_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};


export default function SavedFrames() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState(null);
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState(null);

  const fetchFrames = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/experiments/${id}/frames/`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('savedFrames.errors.load'));
      }

      setFrames(data);
    } catch (error) {
      toast.error(error.message || t('savedFrames.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/experiments/${id}/`, { headers: getAuthHeaders() })
      .then((response) => {
        if (!response.ok) throw new Error(t('savedFrames.errors.experiment'));
        return response.json();
      })
      .then(setExperiment)
      .catch((error) => toast.error(error.message));

    fetchFrames();
  }, [id, fetchFrames, t]);

  const deleteFrame = async (frame) => {
    if (!window.confirm(t('savedFrames.confirmDelete'))) return;

    try {
      const response = await fetch(`${API_BASE_URL}/frames/${frame.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(t('savedFrames.errors.delete'));
      }

      setFrames((currentFrames) =>
        currentFrames.filter((item) => item.id !== frame.id)
      );
      setSelectedFrame(null);
      toast.success(t('savedFrames.deleted'));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="dashboard-page">
      <Sidebar />
      <div className="dashboard-content">
        <TopBar experimentName={experiment?.name} />
      <main className="saved-frames-page">
        <div className="saved-frames-heading">
          <button
            type="button"
            className="exp-back-btn"
            onClick={() => navigate(`/experiment/${id}`, { state: { defaultTab: 'camera' } })}
            aria-label={t('savedFrames.back')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2>{t('savedFrames.title')}</h2>
            <p>{experiment?.name || t('experimentForm.experiment')}</p>
          </div>
        </div>

        {loading ? (
          <p className="frames-message">{t('common.loading')}</p>
        ) : frames.length === 0 ? (
          <div className="frames-empty">
            <span className="material-symbols-outlined">photo_library</span>
            <h3>{t('savedFrames.empty')}</h3>
            <p>{t('savedFrames.emptyHelp')}</p>
          </div>
        ) : (
          <div className="frames-grid">
            {frames.map((frame) => (
              <article className="frame-card" key={frame.id}>
                <button
                  type="button"
                  className="frame-preview-btn"
                  onClick={() => setSelectedFrame(frame)}
                >
                  <img src={frame.image_url} alt={t('savedFrames.frameAlt', { id: frame.id })} />
                </button>
                <div className="frame-card-footer">
                  <div>
                    <time dateTime={frame.captured_at}>
                      {new Date(frame.captured_at).toLocaleString(i18n.resolvedLanguage)}
                    </time>
                    {frame.note && <p>{frame.note}</p>}
                  </div>
                  <button
                    type="button"
                    className="frame-delete-btn"
                    onClick={() => deleteFrame(frame)}
                    aria-label={t('savedFrames.delete')}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {selectedFrame && (
        <div className="frame-modal" onClick={() => setSelectedFrame(null)}>
          <div className="frame-modal-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="frame-modal-close"
              onClick={() => setSelectedFrame(null)}
              aria-label={t('savedFrames.close')}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img src={selectedFrame.image_url} alt={t('savedFrames.frameAlt', { id: selectedFrame.id })} />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

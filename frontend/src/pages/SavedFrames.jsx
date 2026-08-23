import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

import "../App.css";
import logo from "./images/logo_cultiva.svg";


const API_BASE_URL = import.meta.env.VITE_API_URL;


export default function SavedFrames() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState(null);
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState(null);

  const fetchFrames = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/experiments/${id}/frames/`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load saved frames.");
      }

      setFrames(data);
    } catch (error) {
      toast.error(error.message || "Failed to load saved frames.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/experiments/${id}/`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load experiment.");
        return response.json();
      })
      .then(setExperiment)
      .catch((error) => toast.error(error.message));

    fetchFrames();
  }, [id, fetchFrames]);

  const deleteFrame = async (frame) => {
    if (!window.confirm("Delete this saved frame permanently?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/frames/${frame.id}/`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete frame.");
      }

      setFrames((currentFrames) =>
        currentFrames.filter((item) => item.id !== frame.id)
      );
      setSelectedFrame(null);
      toast.success("Frame deleted.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <>
    <ToastContainer
        position="top-right"
        autoClose={3000}
        toastClassName="custom-toast"
      />
      <header className="header">
        <div className="logo" onClick={() => navigate("/dashboard")}>
          <img src={logo} alt="Cultiva logo" className="logo-img" />
          <h1>PlantStalker</h1>
        </div>
      </header>

      <main className="saved-frames-page">
        <div className="saved-frames-heading">
          <button
            type="button"
            className="exp-back-btn"
            onClick={() => navigate(`/experiment/${id}`)}
            aria-label="Back to experiment"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2>Saved frames</h2>
            <p>{experiment?.name || "Experiment"}</p>
          </div>
        </div>

        {loading ? (
          <p className="frames-message">Loading...</p>
        ) : frames.length === 0 ? (
          <div className="frames-empty">
            <span className="material-symbols-outlined">photo_library</span>
            <h3>No saved frames yet</h3>
            <p>Return to the experiment and save a frame from the camera stream.</p>
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
                  <img src={frame.image_url} alt={`Saved frame ${frame.id}`} />
                </button>
                <div className="frame-card-footer">
                  <div>
                    <time dateTime={frame.captured_at}>
                      {new Date(frame.captured_at).toLocaleString("pl-PL")}
                    </time>
                    {frame.note && <p>{frame.note}</p>}
                  </div>
                  <button
                    type="button"
                    className="frame-delete-btn"
                    onClick={() => deleteFrame(frame)}
                    aria-label="Delete frame"
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
              aria-label="Close preview"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img src={selectedFrame.image_url} alt={`Saved frame ${selectedFrame.id}`} />
          </div>
        </div>
      )}
    </>
  );
}

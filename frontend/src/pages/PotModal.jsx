import React, { useState } from "react";
import "../App.css";
import { useTranslation } from "react-i18next";

function PotModalContent({ pot, factors, onClose, onSave }) {
  const { t } = useTranslation();
  const [userDefinedLabel, setUserDefinedLabel] = useState(pot.user_defined_label || "");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (typeof onSave === "function") {
      onSave(pot.label, userDefinedLabel);
    }
    onClose();
  };

  return (
    <div className="pot-modal-overlay">
      <div className="pot-modal-box">
        <button className="close-btn" onClick={onClose} type="button">
          ✕
        </button>

        <h2>{t("potModal.title", { label: pot.label })}</h2>

        <div className="pot-modal-details">
          <strong>{t("newExperiment.replicate", { number: pot.replicate || pot.replicate_number })}</strong>
          {pot.combination ? (
            pot.combination.map((item, index) => (
              <div key={index}>
                {factors[index].name}: <strong>{item.label}</strong>
              </div>
            ))
          ) : (
            <div>{pot.treatment_name}</div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pot-modal-field">
            <input
              type="text"
              maxLength={50}
              placeholder={t("potModal.labelPlaceholder")}
              value={userDefinedLabel}
              onChange={(e) => {
                setUserDefinedLabel(e.target.value);
                if (error) setError("");
              }}
              className={error ? "exp-edit-input--error" : ""}
            />
            {error && <span className="error-text">{error}</span>}
          </div>

          <div className="pot-modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t("potModal.cancel")}
            </button>
            <button type="submit">
              {t("potModal.ok")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PotModal({ isOpen, pot, factors, onClose, onSave }) {
  if (!isOpen || !pot) return null;

  return (
    <PotModalContent
      key={pot.label ?? pot.id}
      pot={pot}
      factors={factors}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

export default PotModal;

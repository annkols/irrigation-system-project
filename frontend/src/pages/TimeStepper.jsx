import React, { useState } from "react";
import { useTranslation } from "react-i18next";

const pad = (number) => String(number).padStart(2, "0");

function StepperSegment({ value, max, onChange, label }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(null);

  const step = (delta) => onChange((value + delta + max + 1) % (max + 1));

  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (!Number.isNaN(parsed)) onChange(Math.min(Math.max(parsed, 0), max));
    setDraft(null);
  };

  return (
    <div className="time-stepper-segment">
      <button type="button" aria-label={t('reports.range.increase', { unit: label })} onClick={() => step(1)}>
        <span className="material-symbols-outlined">keyboard_arrow_up</span>
      </button>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        aria-label={label}
        value={draft ?? pad(value)}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") { e.preventDefault(); setDraft(null); step(1); }
          if (e.key === "ArrowDown") { e.preventDefault(); setDraft(null); step(-1); }
          if (e.key === "Enter") commit();
        }}
      />
      <button type="button" aria-label={t('reports.range.decrease', { unit: label })} onClick={() => step(-1)}>
        <span className="material-symbols-outlined">keyboard_arrow_down</span>
      </button>
    </div>
  );
}

export default function TimeStepper({ value, onChange }) {
  const { t } = useTranslation();
  const [hours, minutes] = value.split(":").map(Number);

  return (
    <div className="time-stepper">
      <StepperSegment
        value={hours}
        max={23}
        label={t('reports.range.hours')}
        onChange={(h) => onChange(`${pad(h)}:${pad(minutes)}`)}
      />
      <span className="time-stepper-colon">:</span>
      <StepperSegment
        value={minutes}
        max={59}
        label={t('reports.range.minutes')}
        onChange={(m) => onChange(`${pad(hours)}:${pad(m)}`)}
      />
    </div>
  );
}

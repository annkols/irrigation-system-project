import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buildChartSeries, formatChartTime } from "./chartDataUtils";
import { useTranslation } from "react-i18next";

const features = [
  { key: "moisture_percent", labelKey: "charts.soilMoisturePlain", unit: "%" },
  { key: "soil_temperature", labelKey: "charts.soilTemperaturePlain", unit: "°C" },
];

const series = [
  { key: "firstPot", color: "#006D3D" },
  { key: "secondPot", color: "#D97706" },
];

export default function PotComparisonChart({ measurements = [], potNumbers = [] }) {
  const { t, i18n } = useTranslation();
  const [featureKey, setFeatureKey] = useState(features[0].key);
  const [firstPotChoice, setFirstPotChoice] = useState(null);
  const [secondPotChoice, setSecondPotChoice] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const firstPot = potNumbers.includes(firstPotChoice) ? firstPotChoice : (potNumbers[0] ?? null);
  const secondPot = potNumbers.includes(secondPotChoice) && secondPotChoice !== firstPot
    ? secondPotChoice
    : (potNumbers.find((number) => number !== firstPot) ?? null);

  const selectedFeature = features.find((feature) => feature.key === featureKey);

  const firstPotData = useMemo(() => buildChartSeries({
    measurements,
    valueKey: featureKey,
    predicate: (measurement) => measurement.pot_number === firstPot,
    startDate,
    endDate,
  }), [endDate, featureKey, firstPot, measurements, startDate]);

  const secondPotData = useMemo(() => buildChartSeries({
    measurements,
    valueKey: featureKey,
    predicate: (measurement) => measurement.pot_number === secondPot,
    startDate,
    endDate,
  }), [endDate, featureKey, measurements, secondPot, startDate]);
  const missingPots = [
    !firstPotData.some((point) => point.value != null) && firstPot,
    !secondPotData.some((point) => point.value != null) && secondPot,
  ].filter(Boolean);

  if (potNumbers.length < 2) {
    return <p className="pot-comparison-empty">{t('charts.twoPotsRequired')}</p>;
  }

  return (
    <div className="chart-panel pot-comparison-panel">
      <div>
        <h3 className="pot-comparison-title">{t('charts.comparePots')}</h3>
        <p className="pot-comparison-description">
          {t('charts.compareHelp')}
        </p>
      </div>

      <div className="sensor-selectors">
        <div className="sensor-selector">
          <label htmlFor="comparison-feature">{t('charts.feature')}</label>
          <select id="comparison-feature" value={featureKey} onChange={(event) => setFeatureKey(event.target.value)}>
            {features.map((feature) => (
              <option key={feature.key} value={feature.key}>{t(feature.labelKey)} ({feature.unit})</option>
            ))}
          </select>
        </div>

        <div className="sensor-selector">
          <label htmlFor="comparison-first-pot">{t('charts.firstPot')}</label>
          <select id="comparison-first-pot" value={firstPot ?? ""} onChange={(event) => setFirstPotChoice(Number(event.target.value))}>
            {potNumbers.map((number) => (
              <option key={number} value={number} disabled={number === secondPot}>P{number}</option>
            ))}
          </select>
        </div>

        <div className="sensor-selector">
          <label htmlFor="comparison-second-pot">{t('charts.secondPot')}</label>
          <select id="comparison-second-pot" value={secondPot ?? ""} onChange={(event) => setSecondPotChoice(Number(event.target.value))}>
            {potNumbers.map((number) => (
              <option key={number} value={number} disabled={number === firstPot}>P{number}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="date-range-picker">
        <input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label={t('charts.comparisonStart')} />
        <span>—</span>
        <input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label={t('charts.comparisonEnd')} />
      </div>

      <p className="chart-data-note">
        {t('charts.comparisonNote')}
      </p>
      {missingPots.length > 0 && (
        <p className="chart-data-warning">
          {t('charts.noFeatureData', { feature: t(selectedFeature.labelKey).toLowerCase(), pots: missingPots.map((pot) => `P${pot}`).join(", ") })}
        </p>
      )}

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart>
            <CartesianGrid strokeDasharray="4 4" opacity={0.12} />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              minTickGap={20}
              tick={{ fill: "#666", fontSize: 12 }}
              tickFormatter={(value) => formatChartTime(value, i18n.resolvedLanguage)}
            />
            <YAxis
              unit={selectedFeature.unit}
              tick={{ fill: "#666", fontSize: 12 }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleString(i18n.resolvedLanguage)}
              formatter={(value, name) => [`${value} ${selectedFeature.unit}`, name]}
            />
            <Legend />
            {series.map((item, index) => (
              <Line
                key={item.key}
                data={index === 0 ? firstPotData : secondPotData}
                dataKey="value"
                connectNulls={false}
                name={`${t(selectedFeature.labelKey)} — P${index === 0 ? firstPot : secondPot}`}
                stroke={item.color}
                strokeWidth={3}
                dot={false}
                type="linear"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

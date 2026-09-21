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

const features = [
  { key: "moisture_percent", label: "Soil moisture", unit: "%" },
  { key: "soil_temperature", label: "Soil temperature", unit: "°C" },
];

const series = [
  { key: "firstPot", color: "#006D3D" },
  { key: "secondPot", color: "#D97706" },
];

export default function PotComparisonChart({ measurements = [], potNumbers = [] }) {
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

  const chartData = useMemo(() => measurements
    .filter((measurement) => measurement.pot_number === firstPot || measurement.pot_number === secondPot)
    .filter((measurement) => !startDate || new Date(measurement.created_at) >= new Date(startDate))
    .filter((measurement) => !endDate || new Date(measurement.created_at) <= new Date(endDate))
    .map((measurement) => ({
      time: new Date(measurement.created_at),
      firstPot: measurement.pot_number === firstPot ? measurement[featureKey] : null,
      secondPot: measurement.pot_number === secondPot ? measurement[featureKey] : null,
    }))
    .sort((a, b) => a.time - b.time), [endDate, featureKey, firstPot, measurements, secondPot, startDate]);

  if (potNumbers.length < 2) {
    return <p className="pot-comparison-empty">At least two pots are required to compare measurements.</p>;
  }

  return (
    <div className="chart-panel pot-comparison-panel">
      <div>
        <h3 className="pot-comparison-title">Compare pots</h3>
        <p className="pot-comparison-description">
          Select one soil measurement and two pots to compare.
        </p>
      </div>

      <div className="sensor-selectors">
        <div className="sensor-selector">
          <label htmlFor="comparison-feature">Feature</label>
          <select id="comparison-feature" value={featureKey} onChange={(event) => setFeatureKey(event.target.value)}>
            {features.map((feature) => (
              <option key={feature.key} value={feature.key}>{feature.label} ({feature.unit})</option>
            ))}
          </select>
        </div>

        <div className="sensor-selector">
          <label htmlFor="comparison-first-pot">First pot</label>
          <select id="comparison-first-pot" value={firstPot ?? ""} onChange={(event) => setFirstPotChoice(Number(event.target.value))}>
            {potNumbers.map((number) => (
              <option key={number} value={number} disabled={number === secondPot}>P{number}</option>
            ))}
          </select>
        </div>

        <div className="sensor-selector">
          <label htmlFor="comparison-second-pot">Second pot</label>
          <select id="comparison-second-pot" value={secondPot ?? ""} onChange={(event) => setSecondPotChoice(Number(event.target.value))}>
            {potNumbers.map((number) => (
              <option key={number} value={number} disabled={number === firstPot}>P{number}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="date-range-picker">
        <input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="Comparison start date" />
        <span>—</span>
        <input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="Comparison end date" />
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="4 4" opacity={0.12} />
            <XAxis
              dataKey="time"
              minTickGap={20}
              tick={{ fill: "#666", fontSize: 12 }}
              tickFormatter={(value) => new Date(value).toLocaleString("pl-PL", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            <YAxis
              unit={selectedFeature.unit}
              tick={{ fill: "#666", fontSize: 12 }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleString("pl-PL")}
              formatter={(value, name) => [`${value} ${selectedFeature.unit}`, name]}
            />
            <Legend />
            {series.map((item, index) => (
              <Line
                key={item.key}
                dataKey={item.key}
                connectNulls
                name={`${selectedFeature.label} — P${index === 0 ? firstPot : secondPot}`}
                stroke={item.color}
                strokeWidth={3}
                dot={false}
                type="monotone"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

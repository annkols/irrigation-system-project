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

import { buildChartSeries, findSharedSensorSource, formatChartTime } from "./chartDataUtils";

const sensors = [
  { key: "air_temperature", label: "Temperature inside (°C)", color: "#36d45d", scope: "shared" },
  { key: "soil_temperature", label: "Soil temperature (°C)", color: "#22c7d6", scope: "pot" },
  { key: "air_humidity", label: "Air humidity (%)", color: "#2962ff", scope: "shared" },
  { key: "moisture_percent", label: "Soil moisture (%)", color: "#ff7b00", scope: "pot" },
  { key: "light_lux", label: "Light intensity (lx)", color: "#a855f7", scope: "shared" },
  { key: "pressure_hpa", label: "Pressure (hPa)", color: "#8b4513", scope: "shared" },
  { key: "pumpLine", label: "Pump", color: "#ff007a", scope: "pot" },
];

const makeSeriesName = (config, sourcePot) => {
  const source = config.scope === "shared"
    ? `shared, source P${sourcePot ?? "-"}`
    : `P${sourcePot ?? "-"}`;
  return `${config.label} (${source})`;
};

export default function ExperimentChart({ measurements = [], selectedPot = null }) {
  const [leftSensor, setLeftSensor] = useState("air_temperature");
  const [rightSensor, setRightSensor] = useState("air_humidity");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const sharedSources = useMemo(() => Object.fromEntries(
    sensors
      .filter((sensor) => sensor.scope === "shared")
      .map((sensor) => [sensor.key, findSharedSensorSource(measurements, sensor.key)])
  ), [measurements]);

  const leftConfig = sensors.find((sensor) => sensor.key === leftSensor);
  const rightConfig = sensors.find((sensor) => sensor.key === rightSensor);
  const leftSourcePot = leftConfig.scope === "shared" ? sharedSources[leftConfig.key] : selectedPot;
  const rightSourcePot = rightConfig.scope === "shared" ? sharedSources[rightConfig.key] : selectedPot;

  const leftData = useMemo(() => buildChartSeries({
    measurements,
    valueKey: leftConfig.key,
    valueGetter: leftConfig.key === "pumpLine" ? (measurement) => (measurement.pump_on ? 1 : 0) : null,
    predicate: (measurement) => measurement.pot_number === leftSourcePot,
    startDate,
    endDate,
  }), [endDate, leftConfig.key, leftSourcePot, measurements, startDate]);

  const rightData = useMemo(() => buildChartSeries({
    measurements,
    valueKey: rightConfig.key,
    valueGetter: rightConfig.key === "pumpLine" ? (measurement) => (measurement.pump_on ? 1 : 0) : null,
    predicate: (measurement) => measurement.pot_number === rightSourcePot,
    startDate,
    endDate,
  }), [endDate, measurements, rightConfig.key, rightSourcePot, startDate]);
  const leftHasData = leftData.some((point) => point.value != null);
  const rightHasData = rightData.some((point) => point.value != null);

  return (
    <div className="chart-panel">
      <div className="sensor-selectors">
        <div className="sensor-selector">
          <label htmlFor="left-chart-sensor">Left</label>
          <select id="left-chart-sensor" value={leftSensor} onChange={(event) => setLeftSensor(event.target.value)}>
            {sensors.map((sensor) => (
              <option key={sensor.key} value={sensor.key} disabled={sensor.key === rightSensor}>
                {sensor.label} ({sensor.scope === "shared" ? "shared" : `P${selectedPot ?? "-"}`})
              </option>
            ))}
          </select>
        </div>

        <div className="sensor-selector">
          <label htmlFor="right-chart-sensor">Right</label>
          <select id="right-chart-sensor" value={rightSensor} onChange={(event) => setRightSensor(event.target.value)}>
            {sensors.map((sensor) => (
              <option key={sensor.key} value={sensor.key} disabled={sensor.key === leftSensor}>
                {sensor.label} ({sensor.scope === "shared" ? "shared" : `P${selectedPot ?? "-"}`})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="date-range-picker">
        <input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="Chart start date" />
        <span>—</span>
        <input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="Chart end date" />
      </div>

      <p className="chart-data-note">
        Lines use actual measurement times. A break in a line means that measurements were missing for longer than expected.
      </p>
      {(!leftHasData || !rightHasData) && (
        <p className="chart-data-warning">
          No data in the selected range for: {[
            !leftHasData && makeSeriesName(leftConfig, leftSourcePot),
            !rightHasData && makeSeriesName(rightConfig, rightSourcePot),
          ].filter(Boolean).join(", ")}.
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
              tickFormatter={formatChartTime}
            />
            <YAxis yAxisId="left" orientation="left" stroke={leftConfig.color} tick={{ fill: leftConfig.color, fontSize: 12 }} domain={["auto", "auto"]} />
            <YAxis yAxisId="right" orientation="right" stroke={rightConfig.color} tick={{ fill: rightConfig.color, fontSize: 12 }} domain={["auto", "auto"]} />
            <Tooltip
              labelFormatter={formatChartTime}
              formatter={(value, name) => [name.startsWith("Pump") ? (value ? "ON" : "OFF") : value, name]}
            />
            <Legend />
            <Line
              data={leftData}
              dataKey="value"
              yAxisId="left"
              name={makeSeriesName(leftConfig, leftSourcePot)}
              stroke={leftConfig.color}
              strokeWidth={3}
              dot={false}
              connectNulls={false}
              type={leftSensor === "pumpLine" ? "stepAfter" : "linear"}
            />
            <Line
              data={rightData}
              dataKey="value"
              yAxisId="right"
              name={makeSeriesName(rightConfig, rightSourcePot)}
              stroke={rightConfig.color}
              strokeWidth={3}
              dot={false}
              connectNulls={false}
              type={rightSensor === "pumpLine" ? "stepAfter" : "linear"}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
import { useTranslation } from "react-i18next";

const sensors = [
  { key: "air_temperature", labelKey: "charts.airTemperature", color: "#36d45d", scope: "shared" },
  { key: "soil_temperature", labelKey: "charts.soilTemperature", color: "#22c7d6", scope: "pot" },
  { key: "air_humidity", labelKey: "charts.airHumidity", color: "#2962ff", scope: "shared" },
  { key: "moisture_percent", labelKey: "charts.soilMoisture", color: "#ff7b00", scope: "pot" },
  { key: "light_lux", labelKey: "charts.lightIntensity", color: "#a855f7", scope: "shared" },
  { key: "pressure_hpa", labelKey: "charts.pressure", color: "#8b4513", scope: "shared" },
  { key: "pumpLine", labelKey: "charts.pump", color: "#ff007a", scope: "pot" },
];

const makeSeriesName = (config, sourcePot, t) => {
  const source = config.scope === "shared"
    ? t('charts.sharedSource', { pot: sourcePot ?? "-" })
    : `P${sourcePot ?? "-"}`;
  return `${t(config.labelKey)} (${source})`;
};

export default function ExperimentChart({ measurements = [], selectedPot = null }) {
  const { t, i18n } = useTranslation();
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
          <label htmlFor="left-chart-sensor">{t('charts.left')}</label>
          <select id="left-chart-sensor" value={leftSensor} onChange={(event) => setLeftSensor(event.target.value)}>
            {sensors.map((sensor) => (
              <option key={sensor.key} value={sensor.key} disabled={sensor.key === rightSensor}>
                {t(sensor.labelKey)} ({sensor.scope === "shared" ? t('charts.shared') : `P${selectedPot ?? "-"}`})
              </option>
            ))}
          </select>
        </div>

        <div className="sensor-selector">
          <label htmlFor="right-chart-sensor">{t('charts.right')}</label>
          <select id="right-chart-sensor" value={rightSensor} onChange={(event) => setRightSensor(event.target.value)}>
            {sensors.map((sensor) => (
              <option key={sensor.key} value={sensor.key} disabled={sensor.key === leftSensor}>
                {t(sensor.labelKey)} ({sensor.scope === "shared" ? t('charts.shared') : `P${selectedPot ?? "-"}`})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="date-range-picker">
        <input type="datetime-local" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label={t('charts.startDate')} />
        <span>—</span>
        <input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label={t('charts.endDate')} />
      </div>

      <p className="chart-data-note">
        {t('charts.dataNote')}
      </p>
      {(!leftHasData || !rightHasData) && (
        <p className="chart-data-warning">
          {t('charts.noData', { series: [
            !leftHasData && makeSeriesName(leftConfig, leftSourcePot, t),
            !rightHasData && makeSeriesName(rightConfig, rightSourcePot, t),
          ].filter(Boolean).join(", ") })}
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
            <YAxis yAxisId="left" orientation="left" stroke={leftConfig.color} tick={{ fill: leftConfig.color, fontSize: 12 }} domain={["auto", "auto"]} />
            <YAxis yAxisId="right" orientation="right" stroke={rightConfig.color} tick={{ fill: rightConfig.color, fontSize: 12 }} domain={["auto", "auto"]} />
            <Tooltip
              labelFormatter={(value) => formatChartTime(value, i18n.resolvedLanguage)}
              formatter={(value, name) => [name.includes(t('charts.pump')) ? (value ? "ON" : "OFF") : value, name]}
            />
            <Legend />
            <Line
              data={leftData}
              dataKey="value"
              yAxisId="left"
              name={makeSeriesName(leftConfig, leftSourcePot, t)}
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
              name={makeSeriesName(rightConfig, rightSourcePot, t)}
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

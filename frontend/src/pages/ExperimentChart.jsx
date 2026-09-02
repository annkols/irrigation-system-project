import React, { useMemo, useState } from "react";

import {ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend} from "recharts";

const sensors = [
  {
    key: "air_temperature",
    label: "Temperature inside (°C)",
    color: "#36d45d",
    scope: "shared"
  },
  {
    key: "soil_temperature",
    label: "Soil temperature (°C)",
    color: "#22c7d6",
    scope: "pot"
  },
  {
    key: "air_humidity",
    label: "Air humidity (%)",
    color: "#2962ff",
    scope: "shared"
  },
  {
    key: "moisture_percent",
    label: "Soil moisture (%)",
    color: "#ff7b00",
    scope: "pot"
  },
  {
    key: "light_lux",
    label: "Light intensity (lx)",
    color: "#a855f7",
    scope: "shared"
  },
  {
    key: "pressure_hpa",
    label: "Pressure (hPa)",
    color: "#8b4513",
    scope: "shared"
  },
  {
    key: "pumpLine",
    label: "Pump",
    color: "#ff007a",
    scope: "pot"
  }
];

export default function ExperimentChart({ measurements = [], selectedPot = null }) {
  const availableSensors = sensors;

  const [leftSensor, setLeftSensor] =
    useState("air_temperature");

  const [rightSensor, setRightSensor] =
    useState("air_humidity");

    const [startDate, setStartDate] = useState(() =>
      measurements.length
        ? new Date(measurements[measurements.length - 1].created_at)
            .toISOString()
            .slice(0, 16)
        : ""
    );
    
    const [endDate, setEndDate] = useState(() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      return now.toISOString().slice(0, 16);
    });


  const allData = useMemo(() => {

    return measurements.map((m) => {

      const belongsToSelectedPot = m.pot_number === selectedPot;

      return {

      ...m,

      time: new Date(m.created_at),

      moisture_percent: belongsToSelectedPot ? m.moisture_percent : null,

      soil_temperature: belongsToSelectedPot ? m.soil_temperature : null,

      pumpLine: belongsToSelectedPot ? (m.pump_on ? 5 : 0) : null

      };
    });

  }, [measurements, selectedPot]);

  const filteredData = useMemo(() => {

    let data = [...allData];

    if (startDate) {

      data = data.filter(
        (d) =>
          new Date(d.created_at) >=
          new Date(startDate)
      );
    }

    if (endDate) {

      data = data.filter(
        (d) =>
          new Date(d.created_at) <=
          new Date(endDate)
      );
    }

    return data;

  }, [
    startDate,
    endDate,
    allData
  ]);

  const leftConfig = availableSensors.find(
    (s) => s.key === leftSensor
  );

  const rightConfig = availableSensors.find(
    (s) => s.key === rightSensor
  );

  if (!leftConfig || !rightConfig) {
    return null;
  }

  return (

    <div className="chart-panel">

      <div className="chart-title-row">
        <h3>EXPERIMENT CHARTS</h3>
      </div>

      <div className="sensor-selectors">

        <div className="sensor-selector">

          <label>Left</label>

          <select
            value={leftSensor}
            onChange={(e) =>
              setLeftSensor(
                e.target.value
              )
            }
          >
            {availableSensors.map((sensor) => (

              <option
                key={sensor.key}
                value={sensor.key}
                disabled={sensor.key === rightSensor}
              >
                {sensor.label} ({sensor.scope === "shared" ? "shared" : `P${selectedPot ?? "-"}`})
              </option>

            ))}
          </select>

        </div>

        <div className="sensor-selector">

          <label>Right</label>

          <select
            value={rightSensor}
            onChange={(e) =>
              setRightSensor(
                e.target.value
              )
            }
          >
            {availableSensors.map((sensor) => (

              <option
                key={sensor.key}
                value={sensor.key}
                disabled={sensor.key === leftSensor
                }
              >
                {sensor.label} ({sensor.scope === "shared" ? "shared" : `P${selectedPot ?? "-"}`})
              </option>

            ))}
          </select>

        </div>

      </div>

      <div className="date-range-picker">

        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) =>
            setStartDate(e.target.value)
          }
        />

        <span>—</span>

        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) =>
            setEndDate(e.target.value)
          }
        />

      </div>

      <div className="chart-wrapper">

        <ResponsiveContainer
          width="100%"
          height={420}
        >

          <LineChart data={filteredData}>

            <CartesianGrid
              strokeDasharray="4 4"
              opacity={0.12}
            />

            <XAxis
              dataKey="time"
              minTickGap={20}
              tick={{
                fill: "#666",
                fontSize: 12
              }}
              tickFormatter={(value) =>
                new Date(value).toLocaleString(
                  "pl-PL",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                  }
                )
              }
            />

            <YAxis
              yAxisId="left"
              orientation="left"
              stroke={leftConfig.color}
              domain={[
                "auto",
                "auto"
              ]}
              tick={{
                fill: leftConfig.color,
                fontSize: 12
              }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={rightConfig.color}
              domain={[
                "auto",
                "auto"
              ]}
              tick={{
                fill: rightConfig.color,
                fontSize: 12
              }}
            />

            <Line
              yAxisId="left"
              dataKey={leftSensor}
              connectNulls
              name={leftConfig.label}
              stroke={leftConfig.color}
              strokeWidth={3}
              dot={false}
              type={
                leftSensor === "pumpLine"
                  ? "stepAfter"
                  : "monotone"
              }
            />

            <Line
              yAxisId="right"
              dataKey={rightSensor}
              connectNulls
              name={rightConfig.label}
              stroke={rightConfig.color}
              strokeWidth={3}
              dot={false}
              type={
                rightSensor === "pumpLine"
                  ? "stepAfter"
                  : "monotone"
              }
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}

import React, { useMemo, useState } from "react";

import measurements from "./measurements.json";

import {ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend} from "recharts";

const sensors = [
  {
    key: "temp",
    label: "Temperature inside (°C)",
    color: "#36d45d"
  },
  {
    key: "soilTemp",
    label: "Soil temperature (°C)",
    color: "#22c7d6"
  },
  {
    key: "humidity",
    label: "Air humidity (%)",
    color: "#2962ff"
  },
  {
    key: "moisture",
    label: "Soil moisture (%)",
    color: "#ff7b00"
  },
  {
    key: "light",
    label: "Light intensity (lx)",
    color: "#a855f7"
  },
  {
    key: "pressure",
    label: "Pressure (hPa)",
    color: "#8b4513"
  },
  {
    key: "pumpLine",
    label: "Pump",
    color: "#ff007a"
  }
];

const sensorSetKeys = {
  1: ["moisture", "temp", "humidity","pumpLine"],
  2: ["moisture", "temp", "humidity", "light", "pumpLine"],
  3: ["moisture", "temp", "humidity","light", "pressure", "soilTemp", "pumpLine"]
};

const getAvailableSensors = (sensorSetId) => {
  const allowedKeys =
    sensorSetKeys[Number(sensorSetId)] ||
    sensors.map((s) => s.key);

  return sensors.filter((sensor) =>
    allowedKeys.includes(sensor.key)
  );
};

export default function ExperimentChart({sensorSetId}) {
  const availableSensors = getAvailableSensors(sensorSetId);

  const [leftSensor, setLeftSensor] =
    useState("temp");

  const [rightSensor, setRightSensor] =
    useState("humidity");

    const [startDate, setStartDate] = useState(() =>
      measurements.length
        ? new Date(measurements[0].timestamp)
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

    return measurements.map((m) => ({

      ...m,

      time: new Date(m.timestamp),

      pumpLine: m.pumpOn ? 5 : 0

    }));

  }, []);

  const filteredData = useMemo(() => {

    let data = [...allData];

    if (startDate) {

      data = data.filter(
        (d) =>
          new Date(d.timestamp) >=
          new Date(startDate)
      );
    }

    if (endDate) {

      data = data.filter(
        (d) =>
          new Date(d.timestamp) <=
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
                {sensor.label}
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
                {sensor.label}
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
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

export default function ExperimentChart() {

  const [activeSensors, setActiveSensors] = useState([
    "temp",
    "soilTemp",
    "humidity",
    "moisture",
    "light",
    "pressure",
    "pumpLine"
  ]);

  const [startDate, setStartDate] = useState();

  const [endDate, setEndDate] = useState();

  const allData = useMemo(() => {

    return measurements.map((m) => ({

      ...m,

      time: new Date(m.timestamp).toLocaleString(
        {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        }
      ),

      pumpLine: m.pumpOn ? 5 : 0

    }));

  }, []);

  const toggleSensor = (key) => {

    setActiveSensors((prev) =>
      prev.includes(key)
        ? prev.filter((s) => s !== key)
        : [...prev, key]
    );
  };

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

  return (

    <div className="chart-panel">

      <div className="chart-title-row">
        <h3>EXPERIMENT CHARTS</h3>
      </div>

      <div className="sensor-buttons">

        {sensors.map((sensor) => (

          <button
            key={sensor.key}
            className={`sensor-btn ${
              activeSensors.includes(sensor.key)
                ? "active"
                : ""
            }`}
            onClick={() => toggleSensor(sensor.key)}
          >

            <span
              className="sensor-dot"
              style={{
                background: sensor.color
              }}
            />

            {sensor.label}

          </button>

        ))}

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
            />

            <YAxis
              domain={[0, "auto"]}
              tick={{
                fill: "#666",
                fontSize: 12
              }}
            />

            <Tooltip />

            <Legend />

            {sensors.map((sensor) => {

              if (
                !activeSensors.includes(sensor.key)
              ) {
                return null;
              }

              return (

                <Line
                  key={sensor.key}

                  type={
                    sensor.key === "pumpLine"
                      ? "stepAfter"
                      : "monotone"
                  }

                  dataKey={sensor.key}

                  stroke={sensor.color}

                  strokeWidth={3}
                  opacity={1}

                  dot={false}

                />

              );
            })}

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}
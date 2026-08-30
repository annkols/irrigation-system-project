import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function ExperimentCard({

    experiment,
    measurements = []

}) {

    const navigate = useNavigate();
    const potNumbers = useMemo(() => {
        const fromPlan = experiment.pot_numbers || [];
        const fromMeasurements = measurements.map((measurement) => measurement.pot_number);
        const available = fromPlan.length ? fromPlan : fromMeasurements;
        return [...new Set(available)].sort((a, b) => a - b);
    }, [experiment.pot_numbers, measurements]);
    const [selectedPot, setSelectedPot] = useState(null);

    useEffect(() => {
        if (potNumbers.length && !potNumbers.includes(selectedPot)) setSelectedPot(potNumbers[0]);
    }, [potNumbers, selectedPot]);

    const latest = measurements.find((measurement) => measurement.pot_number === selectedPot) || null;
    const latestShared = measurements.find((measurement) => (
        measurement.air_temperature != null
        || measurement.air_humidity != null
        || measurement.pressure_hpa != null
        || measurement.light_lux != null
    )) || null;
    const getStatusClass = (status) => {

        switch (status?.toLowerCase()) {

            case "completed":
                return "completed";

            case "in progress":
                return "progress";

            case "not started":
                return "not-started";

            default:
                return "default";
        }

    };

    const daysAgo = () => {

        if (!experiment.started_at) return "-";

        const start = new Date(experiment.started_at);

        const now = new Date();

        const diff = Math.floor(

            (now - start) / (1000 * 60 * 60 * 24)

        );

        return diff;

    };

    return (

        <div
            className="experiment-card"
            onClick={() => navigate(`/experiment/${experiment.id}`)}
        >

            <div className="card-image">

                <img
                    src={`${API_BASE_URL}/experiments/${experiment.id}/frames/latest/image/`}
                    alt="Latest camera frame"
                    className="camera-stream"
                    onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling?.classList.add('card-image-placeholder-visible');
                    }}
                />

                <div className="card-image-placeholder">
                    <span className="material-symbols-outlined">photo_camera</span>
                </div>

                <span className={`status-badge ${getStatusClass(experiment.status)}`}>

                    {experiment.status?.toUpperCase()}

                </span>

            </div>

            <div className="card-body">

                <h2>

                    {experiment.name}

                </h2>

                <div className="card-divider"></div>

                <div className="pot-selector pot-selector--card" onClick={(event) => event.stopPropagation()}>
                    <label htmlFor={`dashboard-pot-${experiment.id}`}>Pot</label>
                    <select
                        id={`dashboard-pot-${experiment.id}`}
                        value={selectedPot ?? ""}
                        onChange={(event) => setSelectedPot(Number(event.target.value))}
                        disabled={!potNumbers.length}
                    >
                        {!potNumbers.length && <option value="">No pots</option>}
                        {potNumbers.map((number) => <option key={number} value={number}>P{number}</option>)}
                    </select>
                </div>

                <div className="card-stats">

                    <div>

                        <span className="label">

                            air temp.

                        </span>

                        <strong>

                            {latestShared?.air_temperature ?? "-"}°C

                        </strong>

                    </div>

                    <div>

                        <span className="label">

                            air humidity

                        </span>

                        <strong>

                            {latestShared?.air_humidity ?? "-"}%

                        </strong>

                    </div>

                    <div>

                        <span className="label">

                            soil moisture

                        </span>

                        <strong>

                            {latest?.moisture_percent ??
                                latest?.soil_moisture ??
                                "-"}%

                        </strong>

                    </div>

                </div>

                <div className="card-divider"></div>

                <div className="card-footer">

                    <span>

                        Started {daysAgo()} days ago

                    </span>

                    <button
                        className="overview-btn"
                        onClick={(e) => {

                            e.stopPropagation();

                            navigate(`/experiment/${experiment.id}`);

                        }}
                    >

                        Experiment Overview

                    </button>

                </div>

            </div>

        </div>

    );

}

import React from "react";
import { useNavigate } from "react-router-dom";

const CAMERA_STREAM_URL = import.meta.env.VITE_CAMERA_STREAM_URL;

export default function ExperimentCard({

    experiment,
    latest

}) {

    const navigate = useNavigate();
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
                    src={CAMERA_STREAM_URL}
                    alt="Camera stream"
                    className="camera-stream"
                />

                <span className={`status-badge ${getStatusClass(experiment.status)}`}>

                    {experiment.status?.toUpperCase()}

                </span>

            </div>

            <div className="card-body">

                <h2>

                    {experiment.name}

                </h2>

                <div className="card-divider"></div>

                <div className="card-stats">

                    <div>

                        <span className="label">

                            air temp.

                        </span>

                        <strong>

                            {latest?.air_temperature ?? "-"}°C

                        </strong>

                    </div>

                    <div>

                        <span className="label">

                            air humidity

                        </span>

                        <strong>

                            {latest?.air_humidity ?? "-"}%

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
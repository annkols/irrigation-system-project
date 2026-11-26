
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { getExperiment } from "@/api/experiments";
import { getLatestMeasurement } from "@/api/measurements";

import type { Measurement } from "@/types/measurements";
import type { Experiment } from "@/types/experiments";

function formatMeasurement(value: number | null, unit: string) {

    return value === null ? "Brak danych" : `${value} ${unit}`;
}

export default function ExperimentDetails() {

    const { id } = useLocalSearchParams<{ id: string }>();

    const [experiment, setExperiment] = useState<Experiment | null>(null);
    const [measurement, setMeasurement] = useState<Measurement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        let active = true;

        async function loadExperimentDetails() {

            setLoading(true);
            setError("");

            try {
                if (!id || !/^\d+$/.test(id)) {
                    throw new Error("Nieprawidłowe ID eksperymentu.");
                }

                const experimentId = Number(id);

                const [experimentData, measurementData] = await Promise.all([
                    getExperiment(experimentId),
                    getLatestMeasurement(experimentId),
                ]);

                if (active) {
                    setExperiment(experimentData);
                    setMeasurement(measurementData);
                }

            } catch (error) {
                if (active) {
                    setError(
                        error instanceof Error ? error.message : "Nie udało się pobrać danych."
                    );
                }

            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadExperimentDetails();

        return () => {
            active = false;
        };

    }, [id]);

    if (loading) {
        return <ActivityIndicator size="large" style={styles.center} />;
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text>{error}</Text>
            </View>
        );
    }

    if (!experiment) {
        return <Text>Nie znaleziono eksperymentu.</Text>;
    }

    return (
        <ScrollView style={styles.container}>

            <Text style={styles.title}>{experiment.name}</Text>
            <Text>Roślina: {experiment.plant_name}</Text>
            <Text>Status: {experiment.status}</Text>
            <Text>{experiment.description}</Text>

            <Text style={styles.subtitle}>Ostatni pomiar</Text>

            {measurement ? (
                <View style={styles.measurements}>

                    <Text>Doniczka: {measurement.pot_number}</Text>

                    <Text>
                        Wilgotność gleby: {formatMeasurement(measurement.moisture_percent, "%")}
                    </Text>

                    <Text>
                        Temperatura gleby: {formatMeasurement(measurement.soil_temperature, "°C")}
                    </Text>

                    <Text>
                        Temperatura powietrza: {formatMeasurement(measurement.air_temperature, "°C")}
                    </Text>

                    <Text>
                        Wilgotność powietrza: {formatMeasurement(measurement.air_humidity, "%")}
                    </Text>

                    <Text>
                        Ciśnienie: {formatMeasurement(measurement.pressure_hpa, "hPa")}
                    </Text>

                    <Text>
                        Natężenie światła: {formatMeasurement(measurement.light_lux, "lux")}
                    </Text>

                    <Text>
                        Pompa: {measurement.pump_on ? "Włączona" : "Wyłączona"}
                    </Text>

                    <Text>
                        Data pomiaru: {new Date(measurement.created_at).toLocaleString("pl-PL")}
                    </Text>

                </View>
            ) : (
                <Text>Brak pomiarów dla tego eksperymentu.</Text>
            )}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 24,
        marginBottom: 12,
    },
    measurements: {
        gap: 12,
        paddingBottom: 30,
    },
});


import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";

import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type Experiment = {
    id: number;
    name: string;
    plant_name: string;
};

export default function Index() {

    const [experiments, setExperiments] = useState<Experiment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        async function loadExperiments() {

            try {
                const token = await SecureStore.getItemAsync("access_token");

                if (!token) {
                    throw new Error("Zaloguj się.");
                }

                if (!API_URL) {
                    throw new Error("Configure EXPO_PUBLIC_API_URL");
                }

                const response = await fetch(
                    `${API_URL}/experiments/owned/`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`);
                }

                const data: Experiment[] = await response.json();
                setExperiments(data);

            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Nie udało się załadować eksperymentów"
                );

            } finally {
                setLoading(false);
            }
        }

        loadExperiments();

    }, []);

    return (
        <View style={styles.container}>

            <Text style={styles.title}>Moje eksperymenty</Text>

            {loading ? (
                <ActivityIndicator size="large" />
            ) : error ? (
                <Text>{error}</Text>
            ) : (
                <FlatList
                    data={experiments}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text>{item.plant_name}</Text>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text>Nie znaleniono aktywnych eksperymentów.</Text>
                    }
                />
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 20,
    },
    card: {
        padding: 16,
        marginBottom: 10,
        backgroundColor: "#e8f0e8",
        borderRadius: 10,
    },
    name: {
        fontSize: 18,
        fontWeight: "bold",
    },
});

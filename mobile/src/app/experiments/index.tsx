
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { getOwnedExperiments } from "@/api/experiments";
import type { Experiment } from "@/types/experiments";
import TestNotificationButton from "@/components/test";


export default function Experiments() {

    const router = useRouter();

    const [experiments, setExperiments] = useState<Experiment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        let active = true;

        async function loadExperiments() {

            try {
                const data = await getOwnedExperiments();

                if (active) {
                    setExperiments(data);
                }

            } catch (error) {
                if (active) {
                    setError(
                        error instanceof Error ? error.message: "Nie udało się pobrać eksperymentów."
                    );
                }

            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadExperiments();

        return () => {
            active = false;
        };

    }, []);


    function openExperiment(id: number) {

        router.push({
            pathname: "/experiments/[id]",
            params: { id: id.toString() },
        });
    }

    return (
        <View style={styles.container}>

            <Text style={styles.name}>Lista eksperymentów</Text>

            <TestNotificationButton />

            {loading ? (
                <ActivityIndicator size="large" />
            ) : error ? (
                <Text>{error}</Text>
            ) : (
                
                <FlatList
                    data={experiments}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.card}
                            onPress={() => openExperiment(item.id)}
                        >
                            <Text style={styles.name}>{item.name}</Text>
                            <Text>{item.plant_name}</Text>
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <Text>Brak eksperymentów.</Text>
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
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
    },
    card: {
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
    },
    name: {
        fontSize: 18,
        fontWeight: "bold",
    },
});

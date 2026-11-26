
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";

import { AuthProvider, useAuth } from "@/context/auth_context";
import NotificationManager from "@/components/notification_manager";

function RootNavigator() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack>
            <Stack.Protected guard={!isAuthenticated}>
                <Stack.Screen
                    name="index"
                    options={{ headerShown: false }}
                />
            </Stack.Protected>

            <Stack.Protected guard={isAuthenticated}>
                <Stack.Screen
                    name="experiments"
                    options={{ headerShown: false }}
                />
            </Stack.Protected>
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootNavigator />
            <NotificationManager />
        </AuthProvider>
    );
}

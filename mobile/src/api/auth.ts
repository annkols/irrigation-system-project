
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function clearTokens() {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
}

export async function refreshAccessToken(): Promise<string> {
    const refresh = await SecureStore.getItemAsync("refresh_token");

    if (!refresh || !API_URL) {
        throw new Error("Session expired");
    }

    const response = await fetch(`${API_URL}/auth/token/refresh/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
        throw new Error("Session expired");
    }

    const data = await response.json();

    if (typeof data.access !== "string") {
        throw new Error("Invalid refresh response");
    }

    await SecureStore.setItemAsync("access_token", data.access);

    // For backends with refresh-token rotation enabled
    if (typeof data.refresh === "string") {
        await SecureStore.setItemAsync("refresh_token", data.refresh);
    }

    return data.access;
}

import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
    throw new Error("Configure EXPO_PUBLIC_API_URL");
}

export async function login(email: string, password: string) {

    const response = await fetch(`${API_URL}/auth/login/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email, password,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Login failed");
    }

    await SecureStore.setItemAsync("access_token", data.access);
    await SecureStore.setItemAsync("refresh_token", data.refresh);

    return data;
}
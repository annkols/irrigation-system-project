
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// token check
export async function apiGet<T>(endpoint: string): Promise<T> {

    if (!API_URL) {
        throw new Error("Configure EXPO_PUBLIC_API_URL");
    }

    const token = await SecureStore.getItemAsync("access_token");

    if (!token) {
        throw new Error("Zaloguj się.");
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        headers: {
Authorization: `Bearer ${token}`,
        }
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json() as T;
}
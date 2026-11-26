
import { Stack } from "expo-router";
import LogoutButton from "@/components/logout_button";

export default function ExperimentsLayout() {
    return (
        <Stack
            screenOptions={{
                headerRight: () => <LogoutButton />,
            }}
        >
            <Stack.Screen
                name="index"
                options={{ title: "Moje eksperymenty" }}
            />

            <Stack.Screen
                name="[id]"
                options={{ title: "Szczegóły eksperymentu" }}
            />
        </Stack>
    );
}

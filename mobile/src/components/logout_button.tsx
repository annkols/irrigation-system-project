
import { Alert, Button } from "react-native";
import { useAuth } from "@/context/auth_context";

export default function LogoutButton() {
    const { signOut } = useAuth();

    function handleLogout() {
        Alert.alert(
            "Wylogowanie",
            "Czy na pewno chcesz się wylogować?",
            [
                {
                    text: "Anuluj",
                    style: "cancel",
                },
                {
                    text: "Wyloguj",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut();
                        } catch {
                            Alert.alert(
                                "Błąd",
                                "Nie udało się wylogować."
                            );
                        }
                    },
                },
            ]
        );
    }

    return (
        <Button
            title="Wyloguj"
            onPress={handleLogout}
        />
    );
}

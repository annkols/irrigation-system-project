
import { Button } from "react-native";
import { testMissingMeasurementsAlert } from "@/notifications/notifications";

export default function TestNotificationButton() {
    return (
        <Button
            title="Testuj powiadomienie"
            onPress={async () => {
                try {
                    await testMissingMeasurementsAlert();
                } catch (error) {
                    console.error("Notification test failed:", error);
                }
            }}
        />
    );
}

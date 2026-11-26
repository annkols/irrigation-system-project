import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function registerForPushNotifications() {
    if (Platform.OS === "web") {
        return null;
    }

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("alerts", {
            name: "Plantstalker Alerts",
            importance: Notifications.AndroidImportance.HIGH,
            sound: "default",
        });
    }

    if (!Device.isDevice) {
        console.log("Push notifications require a supported device");
        return null;
    }

    const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } =
            await Notifications.requestPermissionsAsync();

        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.log("Notification permission denied");
        return null;
    }

    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

    if (!projectId) {
        console.log("EAS project ID not configured");
        return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
        projectId,
    });

    console.log("Expo push token:", token.data);

    return token.data;
}

export async function testMissingMeasurementsAlert() {
    const { status } =
        await Notifications.requestPermissionsAsync();

    if (status !== "granted") {
        console.log("Notification permission denied");
        return;
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Brak pomiarów",
            body: "Stacja 1 nie przesłała nowych pomiarów od 5 minut.",
            data: {
                type: "missing_measurements",
                station_number: 1,
            },
        },
        trigger: null,
    });

    console.log("Test notification scheduled");
}

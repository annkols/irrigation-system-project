
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/context/auth_context";

export default function NotificationManager() {
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated || Platform.OS === "web") {
            return;
        }

        const receivedSubscription =
            Notifications.addNotificationReceivedListener(
                (notification) => {
                    console.log(
                        "Notification received:",
                        notification.request.content
                    );
                }
            );

        const responseSubscription =
            Notifications.addNotificationResponseReceivedListener(
                (response) => {
                    console.log(
                        "Notification clicked:",
                        response.notification.request.content
                    );
                }
            );

        return () => {
            receivedSubscription.remove();
            responseSubscription.remove();
        };
    }, [isAuthenticated]);

    return null;
}

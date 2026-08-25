import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registers this device so admins/staff get a push the moment a new order comes in
// (see notifyOrderStatus / future notifyNewOrder hooks server-side).
export function usePushRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (existing !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      try {
        await api.post("/devices/register", {
          token: tokenData.data,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
      } catch (err) {
        console.warn("Push registration failed:", err.message);
      }
    })();
  }, [user]);
}

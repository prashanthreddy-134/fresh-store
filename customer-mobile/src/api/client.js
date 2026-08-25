import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// For a physical device/emulator, localhost won't reach your dev machine —
// use your machine's LAN IP (e.g. http://192.168.1.5:4000/api) or a deployed URL.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("fs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

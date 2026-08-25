import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("fs_user").then((raw) => {
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  async function login(token, userData) {
    await AsyncStorage.setItem("fs_token", token);
    await AsyncStorage.setItem("fs_user", JSON.stringify(userData));
    setUser(userData);
  }

  async function logout() {
    await AsyncStorage.multiRemove(["fs_token", "fs_user"]);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

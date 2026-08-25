import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("fs_admin_user");
    return raw ? JSON.parse(raw) : null;
  });

  function login(token, userData) {
    localStorage.setItem("fs_admin_token", token);
    localStorage.setItem("fs_admin_user", JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("fs_admin_token");
    localStorage.removeItem("fs_admin_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

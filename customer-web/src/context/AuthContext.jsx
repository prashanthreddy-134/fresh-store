import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("fs_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("fs_user");
      localStorage.removeItem("fs_token");
      return null;
    }
  });

  function login(token, userData) {
    localStorage.setItem("fs_token", token);
    localStorage.setItem("fs_user", JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("fs_token");
    localStorage.removeItem("fs_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
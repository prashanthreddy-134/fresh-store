import axios from "axios";

export const api = axios.create({
  baseURL:
  import.meta.env.VITE_API_URL ||
  "https://fresh-store-0nvr.onrender.com/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("fs_token");
      localStorage.removeItem("fs_user");
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    return Promise.reject(err);
  }
);

import axios from "axios";

const configuredApiUrl =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";
export const API_URL = configuredApiUrl.endsWith("/api")
  ? configuredApiUrl
  : `${configuredApiUrl.replace(/\/$/, "")}/api`;
export const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pulsvote_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const voterId = () => {
  let id = localStorage.getItem("pulsvote_voter");
  if (!id) {
    id = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem("pulsvote_voter", id);
  }
  return id;
};

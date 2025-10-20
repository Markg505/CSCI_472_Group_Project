import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("rbos_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

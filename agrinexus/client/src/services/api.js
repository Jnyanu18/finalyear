import axios from "axios";
import { useAuthStore } from "../store/authStore";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

export async function post(path, payload) {
  const response = await api.post(path, payload);
  return response.data?.data;
}

export async function get(path) {
  const response = await api.get(path);
  return response.data?.data;
}

export async function put(path, payload) {
  const response = await api.put(path, payload);
  return response.data?.data;
}

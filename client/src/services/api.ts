import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { API_ORIGIN } from "../lib/api-base";

// The baseURL in Next.js when hitting its own routes usually doesn't need the host in the browser
// but for absolute requests or SSR, we fallback to our known hostname or just `/api/v1` equivalent
const baseURL = import.meta.env.VITE_API_URL || API_ORIGIN || "";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config: any) => {
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

export async function post(path: string, payload: any) {
  const response = await api.post(path, payload);
  // Next.js returning standard struct: { success: true, data: { ... } }
  return response.data?.data || response.data;
}

export async function get(path: string) {
  const response = await api.get(path);
  return response.data?.data || response.data;
}

export async function put(path: string, payload: any) {
  const response = await api.put(path, payload);
  return response.data?.data || response.data;
}

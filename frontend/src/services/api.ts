import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/constants/roles";

// ─────────────────────────────────────────────
//  Axios instance
// ─────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});


// ─────────────────────────────────────────────
//  Request interceptor — attach JWT on every call
// ─────────────────────────────────────────────

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


// ─────────────────────────────────────────────
//  Response interceptor — handle 401 globally
// ─────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear storage
      await SecureStore.deleteItemAsync("access_token");
      await SecureStore.deleteItemAsync("user_id");
      await SecureStore.deleteItemAsync("user_role");
      // Navigation to login is handled by the auth store
    }
    return Promise.reject(error);
  }
);

export default api;
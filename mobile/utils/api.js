import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { preventOverlap } from "../utils/requestControl"; // adjust path to match your structure
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig.extra.apiUrl;

// use API_BASE_URL instead of the hardcoded string // ⚠️ REPLACE with your actual local IP

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error retrieving token:", error);
  }
  return config;
});

export const partnerAPI = {
  register: (data) => api.post("/partners/register", data),
  login: (data) => api.post("/partners/login", data),
  updateLocation: preventOverlap((lat, lng) =>
    api.post("/partners/me/location", { lat, lng }),
  ),
};

// ---- Response interceptor: handle 429 with backoff retry ----
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status === 401) {
      // Token invalid/expired, or account removed/revoked by admin
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('partnerInfo');
      // You'll need a navigation reset here — see note below
      return Promise.reject(error);
    }

    if (response?.status === 429 && config && !config._retried429) {
      config._retried429 = true;
      const retryAfterHeader = response.headers['retry-after'];
      const retryAfterMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : 2000;
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
      return api(config);
    }

    return Promise.reject(error);
  }
);
export const locationAPI = {
  getAll: (lat, lng, radius = 30, search = "") =>
    api.get("/locations", { params: { lat, lng, radius, search } }),
  getPending: () => api.get("/locations/pending"),
  getOne: (id) => api.get(`/locations/${id}`),
  add: (data) => api.post("/locations", data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  approve: (id) => api.post(`/locations/${id}/approve`),
  reject: (id, reason) => api.post(`/locations/${id}/reject`, { reason }),
  delete: (id) => api.delete(`/locations/${id}`),
};

export const settingsAPI = {
  getApprovalMode: () => api.get("/settings/approval-mode"),
  toggleApprovalMode: () => api.post("/settings/approval-mode/toggle"),
};

export const editRequestAPI = {
  submit: (data) => api.post("/edit-requests", data),
};
export default api;

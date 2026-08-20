import axios from "axios";
import { extractErrorMessage } from "./errorHandler";
import Cookies from "js-cookie";

let logoutFn = null;
let refreshAccessTokenFn = null;

export const setAuthHandlers = (updateFn, logout, refreshFn) => {
  logoutFn = logout;
  refreshAccessTokenFn = refreshFn;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const accessToken = Cookies.get("access_token");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (!refreshAccessTokenFn) {
        error.message = extractErrorMessage(error);
        return Promise.reject(error);
      }

      try {
        const newAccessToken = await refreshAccessTokenFn();

        if (!newAccessToken) {
          error.message = extractErrorMessage(error);
          return Promise.reject(error);
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        error.message = extractErrorMessage(error);
        return Promise.reject(error);
      }
    }

    error.message = extractErrorMessage(error);
    return Promise.reject(error);
  },
);

export default api;

import axios from "axios";
import { extractErrorMessage } from "./errorHandler";
import Cookies from "js-cookie";

let updateAuthState = null;
let logoutFn = null;

const BASE_URL = "https://pos-dev.amptechnology.in/api";
// const BASE_URL = "https://pos-billing-backend.amptechnology.in/api";

// Connect auth handlers
export const setAuthHandlers = (updateFn, logout) => {
  updateAuthState = updateFn;
  logoutFn = logout;
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------
// ✅ REQUEST INTERCEPTOR — ATTACH ACCESS TOKEN PROPERLY
// ---------------------------------------------------

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const accessToken = Cookies.get("access_token"); // JWT STRING

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  return config;
});

// ---------------------------------------------------
// 🔁 AUTO REFRESH TOKEN HANDLING
// ---------------------------------------------------

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config;

    // Token expired → Refresh token logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const storedAuth = localStorage.getItem("auth");
            if (!storedAuth) throw new Error("No auth found");

            const { accessToken, refreshToken } = JSON.parse(storedAuth);

            // Refresh request
            const res = await axios.post(
              `${BASE_URL}/auth/refresh-tokens`,
              { refreshToken },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (res.data?.success && res.data?.data) {
              const newTokens = {
                accessToken: res.data.data.accessToken,
                refreshToken: res.data.data.refreshToken,
              };

              const updated = {
                ...JSON.parse(storedAuth),
                ...newTokens,
                isAuthenticated: true,
              };

              localStorage.setItem("auth", JSON.stringify(updated));

              // Update React Context tokens
              if (updateAuthState) updateAuthState(updated);

              // Update cookies (important)
              Cookies.set("access_token", newTokens.accessToken);
              Cookies.set("refresh_token", newTokens.refreshToken);

              return newTokens;
            }

            throw new Error("Refresh failed");
          } catch (err) {
            localStorage.removeItem("auth");
            Cookies.remove("access_token");
            Cookies.remove("refresh_token");

            if (logoutFn) logoutFn(false);
            throw err;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      // Retry API after refresh
      try {
        const newTokens = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    // Normal errors
    error.message = extractErrorMessage(error);
    return Promise.reject(error);
  }
);

export default api;

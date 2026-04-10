"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import api, { setAuthHandlers } from "../utils/api";
import { extractErrorMessage } from "../utils/errorHandler";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

// Permission roles
export const roles = {
  OWNER: "owner",
  MANAGER: "manager",
  STAFF: "staff",
};

export const permissions = {
  ALL: "all",
  CAN_MANAGE_USERS: "manage_users",
  CAN_MANAGE_STORE: "manage_store",
  CAN_MANAGE_PRODUCTS: "manage_products",
  CAN_MANAGE_CATEGORIES: "manage_categories",
  CAN_CREATE_INVOICES: "create_invoices",
  CAN_EDIT_INVOICES: "edit_invoices",
  CAN_CANCEL_INVOICES: "cancel_invoices",
  CAN_VIEW_INVOICES: "view_invoices",
  CAN_MANAGE_SETTINGS: "manage_settings",
  CAN_MANAGE_STOCKS: "manage_stocks",
  CAN_MANAGE_SUBSCRIPTIONS: "manage_subscriptions",
  CAN_CREATE_PURCHASES: "create_purchases",
  CAN_EDIT_PURCHASES: "edit_purchases",
  CAN_CANCEL_PURCHASES: "cancel_purchases",
  CAN_VIEW_PURCHASES: "view_purchases",
};

export let isBootstrapping = true;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const router = useRouter();

  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    tempToken: null,
  });

  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [subLoading, setSubLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Register handlers for API refresh system
  useEffect(() => {
    setAuthHandlers(updateAuthState, logout);
  }, []);

  // Restore auth from localStorage
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedOnboarding = localStorage.getItem("onboarding");
        setHasCompletedOnboarding(storedOnboarding === "true");

        const storedAuth = localStorage.getItem("auth");
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);

          if (parsed.accessToken) {
            const decoded = jwtDecode(parsed.accessToken);

            if (decoded.exp * 1000 > Date.now()) {
              setAuthState({ ...parsed, isAuthenticated: true });
            } else if (parsed.refreshToken) {
              try {
                const res = await api.post("/auth/refresh-tokens", {
                  refreshToken: parsed.refreshToken,
                });

                if (res.success && res.data) {
                  const updated = {
                    ...parsed,
                    accessToken: res.data.accessToken,
                    refreshToken: res.data.refreshToken,
                    isAuthenticated: true,
                  };
                  localStorage.setItem("auth", JSON.stringify(updated));
                  setAuthState(updated);
                }
              } catch {
                setAuthState({ isAuthenticated: false });
              }
            }
          }
        }
      } catch {
        setAuthState({ isAuthenticated: false });
      } finally {
        setLoading(false);
        isBootstrapping = false;
      }
    };

    bootstrap();
  }, []);

  // Fetch user profile after login
  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchUserProfile();
      fetchSubscription();
    }
  }, [authState.isAuthenticated]);

  // Fetch subscription
  const fetchSubscription = async () => {
    try {
      setSubLoading(true);
      const response = await api.get("/subscription/get-active-subscriptions");

      if (response.data?.subscription) {
        setSubscription(response.data.subscription);
        setUsage(response.data.usage);
      }
    } catch (err) {
      console.log("[Subscription] Error:", err);
    } finally {
      setSubLoading(false);
    }
  };

  // Update auth state & persist
  const updateAuthState = async (newState) => {
    setAuthState(newState);
    localStorage.setItem("auth", JSON.stringify(newState));
  };

  // Fetch profile
  const fetchUserProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.success && res.data) {
        const updated = {
          ...authState,
          user: res.data,
        };
        setAuthState(updated);
        localStorage.setItem("auth", JSON.stringify(updated));
      }
    } catch (err) {
      console.log("[Auth] User fetch failed:", err);
    }
  };

  // OTP Send
  const sendOtp = async (phone) => {
    try {
      return await api.post("/auth/get-otp", { phone });
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // OTP Verify
  const verifyOtp = async (phone, otp) => {
    try {
      const res = await api.post("/auth/verify-otp", { phone, otp });

      if (res.success) {
        console.log("OTP VERIFY RESPONSE:", res);

        // 1️⃣ USER EXISTS → DIRECT LOGIN
        if (res.data?.user) {
          const newAuth = {
            isAuthenticated: true,
            user: res.data.user,
            accessToken: res.data.tokens.accessToken,
            refreshToken: res.data.tokens.refreshToken,
            tempToken: null,
          };

          await updateAuthState(newAuth);

          Cookies.set("access_token", res.data.tokens.accessToken);
          Cookies.set("refresh_token", res.data.tokens.refreshToken);
          Cookies.set("user", JSON.stringify(res.data.user));

          // redirect to dashboard
          router.push("/dashboard");

          return res;
        }

        // 2️⃣ NEW USER → REGISTRATION FLOW
        if (res.data?.tempToken) {
          console.log("TEMP TOKEN RECEIVED:", res.data.tempToken);

          await updateAuthState({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            tempToken: res.data.tempToken,
          });

          router.push(`/auth/register?phone=${phone}`);
          return res;
        }
      }

      // ❌ OTP FAILED
      return res;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Complete Registration
  const completeRegistration = async (formData) => {
    try {
      const res = await api.post("/auth/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${authState.tempToken}`,
        },
      });

      if (res.success) {
        const newAuth = {
          isAuthenticated: true,
          user: res.data.user,
          accessToken: res.data.tokens.accessToken,
          refreshToken: res.data.tokens.refreshToken,
          tempToken: null,
        };
        await updateAuthState(newAuth);
      }

      return res;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Logout
  const logout = async () => {
    localStorage.removeItem("auth");
    setAuthState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      tempToken: null,
    });

    router.push("/auth");
  };

  const hasPermission = (perm) => {
    const userRole = authState?.user?.role;
    if (!userRole) return false;

    const userPerms = userRole.permissions || [];
    return userPerms.includes(permissions.ALL) || userPerms.includes(perm);
  };

  const completeOnboarding = () => {
    localStorage.setItem("onboarding", "true");
    setHasCompletedOnboarding(true);
  };

  const contextValue = useMemo(
    () => ({
      authState,
      user: authState.user,
      loading,
      hasCompletedOnboarding,
      updateAuthState,
      sendOtp,
      verifyOtp,
      completeRegistration,
      logout,
      subscription,
      usage,
      subLoading,
      fetchSubscription,
      hasPermission,
      fetchUserProfile,
      completeOnboarding,
    }),
    [authState, loading, subscription, usage, subLoading]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

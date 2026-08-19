"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
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

const REFRESH_BUFFER_MS = 60 * 1000;

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

  const authStateRef = useRef(authState);

  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [subLoading, setSubLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const refreshPromiseRef = useRef(null);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  useEffect(() => {
    setAuthHandlers(updateAuthState, logout, refreshAccessToken);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedOnboarding = localStorage.getItem("onboarding");
        setHasCompletedOnboarding(storedOnboarding === "true");

        const storedAuth = localStorage.getItem("auth");
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);

          if (parsed.accessToken) {
            const decoded = safeDecode(parsed.accessToken);
            const stillValid =
              decoded && decoded.exp * 1000 > Date.now() + REFRESH_BUFFER_MS;

            if (stillValid) {
              const sessionOk = await verifySessionSilently(parsed.accessToken);
              if (sessionOk) {
                setAuthState({ ...parsed, isAuthenticated: true });
                scheduleProactiveRefresh(parsed.accessToken);
              } else if (parsed.refreshToken) {
                await tryRefresh(parsed);
              } else {
                await hardLogoutLocalOnly();
              }
            } else if (parsed.refreshToken) {
              await tryRefresh(parsed);
            } else {
              await hardLogoutLocalOnly();
            }
          } else if (parsed.tempToken) {
            setAuthState({ ...parsed, isAuthenticated: false });
          }
        }
      } catch {
        await hardLogoutLocalOnly();
      } finally {
        setLoading(false);
        isBootstrapping = false;
      }
    };

    bootstrap();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // Fetch user profile after login
  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchUserProfile();
      fetchSubscription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.isAuthenticated]);

  const safeDecode = (token) => {
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  };

  const verifySessionSilently = async (accessToken) => {
    try {
      const res = await api.get("/auth/verify-session", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return !!res.success;
    } catch {
      return false;
    }
  };

  const refreshAccessToken = async (currentState) => {
    const state = currentState || authStateRef.current; // ✅ ref use করো

    if (!state.refreshToken) {
      await logout();
      return null;
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const res = await api.post("/auth/refresh-tokens", {
          refreshToken: state.refreshToken,
        });

        if (res.success && res.data) {
          const updated = {
            ...state,
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken || state.refreshToken,
            isAuthenticated: true,
          };

          await updateAuthState(updated);

          Cookies.set("access_token", updated.accessToken);
          Cookies.set("refresh_token", updated.refreshToken);

          scheduleProactiveRefresh(updated.accessToken);

          return updated.accessToken;
        }

        await logout();
        return null;
      } catch (err) {
        await logout();
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  const tryRefresh = async (parsed) => {
    const newToken = await refreshAccessToken(parsed);
    if (!newToken) {
      await hardLogoutLocalOnly();
    }
  };

  // ✅ token expire howar age e nijei refresh kore newa (proactive) — jate hঠাৎ 401 e logout na hoy
  const scheduleProactiveRefresh = (accessToken) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const decoded = safeDecode(accessToken);
    if (!decoded?.exp) return;

    const msUntilRefresh = decoded.exp * 1000 - Date.now() - REFRESH_BUFFER_MS;

    if (msUntilRefresh <= 0) {
      // already close to expiry — ekhoni refresh koro
      refreshAccessToken();
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshAccessToken();
    }, msUntilRefresh);
  };

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

  const updateAuthState = async (newState) => {
    authStateRef.current = newState;
    setAuthState(newState);
    localStorage.setItem("auth", JSON.stringify(newState));
  };

  // Fetch profile
  const fetchUserProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.success && res.data) {
        setAuthState((prev) => {
          const updated = { ...prev, user: res.data };
          localStorage.setItem("auth", JSON.stringify(updated));
          return updated;
        });
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

          scheduleProactiveRefresh(newAuth.accessToken);

          router.push("/dashboard");
          return res;
        }

        // 2️⃣ NEW USER → REGISTRATION FLOW
        if (res.data?.tempToken) {
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

        Cookies.set("access_token", res.data.tokens.accessToken);
        Cookies.set("refresh_token", res.data.tokens.refreshToken);
        Cookies.set("user", JSON.stringify(res.data.user));

        scheduleProactiveRefresh(newAuth.accessToken);
      }

      return res;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // ✅ শুধু local state/storage clear — backend call ছাড়া (bootstrap fail-safe এর জন্য)
  const hardLogoutLocalOnly = async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    localStorage.removeItem("auth");
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    Cookies.remove("user");
    setAuthState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      tempToken: null,
    });
  };

  const logout = async () => {
    try {
      const currentToken = authStateRef.current.accessToken; // ✅ ref use করো
      if (currentToken) {
        await api.post(
          "/auth/logout",
          {},
          { headers: { Authorization: `Bearer ${currentToken}` } },
        );
      }
    } catch (err) {
      console.log("[Auth] Logout API failed:", err?.message);
    } finally {
      await hardLogoutLocalOnly();
      router.push("/auth");
    }
  };

  const hasPermission = (perm) => {
    const userRole = authState?.user?.role;
    if (!userRole) return false;

    const userPerms = userRole.permissions || [];
    return userPerms.includes(permissions.ALL) || userPerms.includes(perm);
  };

  const storeSettings = authState?.user?.store?.settings || {};
  const isStockEnabled = !!storeSettings.stockManagement;
  const isPurchaseOrderEnabled = !!storeSettings.purchaseOrderManagement;
  const isMrpEnabled = !!storeSettings.mrpManagement;

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
      refreshAccessToken,
      subscription,
      usage,
      subLoading,
      fetchSubscription,
      hasPermission,
      fetchUserProfile,
      completeOnboarding,
      isStockEnabled,
      isPurchaseOrderEnabled,
      isMrpEnabled,
      hasCompletedOnboarding,
    }),
    [authState, loading, subscription, usage, subLoading],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

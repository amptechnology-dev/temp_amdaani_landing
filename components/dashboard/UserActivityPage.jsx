"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { motion } from "framer-motion";
import { toast } from "sonner";

import {
  Loader2,
  ShieldAlert,
  LogOut,
  History,
  Smartphone,
  Tablet,
  Monitor,
  MonitorSmartphone,
  Globe,
  MapPin,
  Clock,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const extractErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return "An unexpected error occurred";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getDeviceIcon = (device) => {
  if (!device) return MonitorSmartphone;
  const d = device.toLowerCase();
  if (d.includes("mobile") || d.includes("phone")) return Smartphone;
  if (d.includes("tablet")) return Tablet;
  if (d.includes("desktop") || d.includes("pc")) return Monitor;
  return MonitorSmartphone;
};

export default function UserActivityPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  const [loginHistory, setLoginHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isLogoutAllDialogOpen, setIsLogoutAllDialogOpen] = useState(false);
  const [isLogoutAllLoading, setIsLogoutAllLoading] = useState(false);

  const fetchLoginHistory = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/login-activity/login-history");
      if (res?.success && res?.data) {
        setLoginHistory(res.data);
      }
    } catch (error) {
      toast.error(`Failed to load login history: ${extractErrorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoginHistory();
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await fetchLoginHistory();
      toast.success("Login history refreshed!");
    } catch {
      toast.error("Failed to refresh login history");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      setIsLogoutAllLoading(true);
      const res = await api.post("/auth/logout-all-other-devices");
      if (res?.success) {
        toast.success(res.message || "Logged out from all other devices");
        fetchLoginHistory();
      } else {
        toast.error(res?.message || "Failed to logout from other devices");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Something went wrong");
    } finally {
      setIsLogoutAllLoading(false);
      setIsLogoutAllDialogOpen(false);
    }
  };

  return (
    <div className={`min-h-screen p-3 md:p-4 ${currentTheme.background}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${currentTheme.text}`}>
            User Activity
          </h1>
          <p className={`text-sm ${currentTheme.textSecondary}`}>
            Review recent logins and manage active sessions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-sm h-9"
          onClick={refreshData}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`w-4 h-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* ── Security banner ── */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-[18px] h-[18px] text-red-600" />
          <span className="text-sm font-bold text-red-600">
            Suspicious activity?
          </span>
        </div>
        <p className="text-xs text-red-700/80 leading-relaxed mb-3">
          Logout from all other devices to keep your account secure.
        </p>
        <Button
          onClick={() => setIsLogoutAllDialogOpen(true)}
          disabled={isLogoutAllLoading}
          className="h-[42px] text-[13px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-[10px]"
        >
          {isLogoutAllLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4 mr-2" />
          )}
          Logout From All Devices
        </Button>
      </div>

      {/* ── Login history list ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-14 text-slate-400 text-sm bg-white rounded-lg border border-slate-200">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading login history...
        </div>
      ) : loginHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-lg border border-slate-200">
          <History className="w-11 h-11 text-slate-300 mb-2" />
          <p className="text-base font-semibold text-slate-700">
            No Login History Found
          </p>
          <p className="text-sm text-slate-400 max-w-xs mt-0.5">
            Your recent logins will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {loginHistory.map((item, index) => {
            const DeviceIcon = getDeviceIcon(item.device);
            const locationLabel =
              item.location?.city && item.location.city !== "Unknown"
                ? `${item.location.city}, ${item.location.country}`
                : "Unknown Location";

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                className="bg-white rounded-xl border border-slate-200 p-3.5"
              >
                {/* Top row: device + date */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <DeviceIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-800">
                      {item.device || "Unknown Device"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(item.loginAt)}
                  </span>
                </div>

                <div className="h-px bg-slate-100 mb-2.5" />

                {/* Bottom row: IP + location + time chip */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      <Globe className="w-[13px] h-[13px] shrink-0" />
                      {item.ipAddress || "—"}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      <MapPin className="w-[13px] h-[13px] shrink-0" />
                      {locationLabel}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 shrink-0 bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2.5 py-1.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    {formatTime(item.loginAt)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ---------------- Logout All Confirmation ---------------- */}
      <AlertDialog
        open={isLogoutAllDialogOpen}
        onOpenChange={setIsLogoutAllDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout All Devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will log you out from all other active sessions. You will
              remain logged in on this device only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsLogoutAllDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutAllDevices}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isLogoutAllLoading}
            >
              {isLogoutAllLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              Logout All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
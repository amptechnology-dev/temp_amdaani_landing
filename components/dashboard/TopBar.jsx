"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Sun,
  Moon,
  User,
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Topbar({ theme, pageTitle = "Overview" }) {
  const { theme: currentTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setShowUserMenu(false);
    router.push("/dashboard/profile");
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setShowUserMenu(false);
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 ${theme.surface} border-b ${theme.outline}`}
    >
      <div className="px-5 md:px-7 h-16 flex items-center justify-between gap-4">
        {/* Left: sidebar trigger + breadcrumb / page title */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger
            className={`${theme.buttonTertiary} p-2 rounded-lg border ${theme.outline} shrink-0 cursor-pointer`}
          />

          <div className="hidden md:block h-6 w-px bg-slate-200 mx-1" />

          <div className="hidden md:flex flex-col justify-center min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/dashboard"
                    className={`text-[12px] font-medium ${theme.textSecondary} hover:${theme.text} transition-colors cursor-pointer`}
                  >
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <span
                    className={`text-[12px] font-medium ${theme.textSecondary}`}
                  >
                    {pageTitle}
                  </span>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1
              className={`text-[15px] font-bold ${theme.text} leading-tight truncate mt-0.5`}
            >
              {pageTitle}
            </h1>
          </div>

          {/* Mobile page title */}
          <h1
            className={`md:hidden text-[15px] font-bold ${theme.text} truncate`}
          >
            {pageTitle}
          </h1>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border ${theme.outline} ${theme.buttonTertiary} transition-colors cursor-pointer`}
            aria-label={`Switch to ${currentTheme === "light" ? "dark" : "light"} mode`}
          >
            {currentTheme === "light" ? (
              <Moon size={18} className={theme.text} />
            ) : (
              <Sun size={18} className={theme.text} />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className={`p-2 rounded-lg border ${theme.outline} ${theme.buttonTertiary} relative transition-colors cursor-pointer`}
              aria-label="Notifications"
            >
              <Bell size={18} className={theme.text} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className={`absolute right-0 mt-2 w-80 ${theme.card} rounded-xl shadow-xl border ${theme.outline} py-2 z-50`}
              >
                <div
                  className={`px-4 py-2.5 border-b ${theme.outline} flex items-center justify-between`}
                >
                  <h3 className={`${theme.text} font-semibold text-[13.5px]`}>
                    Notifications
                  </h3>
                  {notifications.length > 0 && (
                    <span className="text-[11px] font-medium text-blue-600 cursor-pointer">
                      Mark all read
                    </span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell size={22} className="mx-auto mb-2 text-slate-300" />
                    <p className={`${theme.textSecondary} text-[13px]`}>
                      No new notifications
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {/* Notification items would go here */}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            onClick={() => router.push("/dashboard/settings")}
            className={`p-2 rounded-lg border ${theme.outline} ${theme.buttonTertiary} transition-colors cursor-pointer hidden sm:flex items-center justify-center`}
            aria-label="Settings"
          >
            <Settings size={18} className={theme.text} />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg border ${theme.outline} ${theme.buttonTertiary} transition-colors cursor-pointer`}
              aria-label="User menu"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0 ring-1 ring-blue-700/10">
                <User size={15} className="text-white" strokeWidth={2.25} />
              </div>
              <span
                className={`hidden md:inline ${theme.text} font-semibold text-[13px]`}
              >
                {user?.name || "User"}
              </span>
              <ChevronDown
                size={14}
                className={`${theme.textSecondary} transition-transform ${showUserMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showUserMenu && (
              <div
                className={`absolute right-0 mt-2 w-52 ${theme.card} rounded-xl shadow-xl border ${theme.outline} py-1.5 z-50`}
              >
                <div className={`px-3.5 py-2 border-b ${theme.outline} mb-1`}>
                  <p
                    className={`${theme.text} font-semibold text-[13px] truncate`}
                  >
                    {user?.name || "User"}
                  </p>
                  <p
                    className={`${theme.textSecondary} text-[11.5px] truncate`}
                  >
                    {user?.email || ""}
                  </p>
                </div>
                <button
                  onClick={handleProfileClick}
                  className={`w-[calc(100%-8px)] flex items-center gap-2.5 text-left px-3.5 py-2 rounded-lg mx-1 hover:${theme.surfaceVariant} ${theme.text} text-[13px] font-medium transition-colors cursor-pointer`}
                >
                  <User size={15} className={theme.textSecondary} />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-[calc(100%-8px)] flex items-center gap-2.5 text-left px-3.5 py-2 rounded-lg mx-1 hover:bg-red-50 text-red-600 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <LogOut size={15} />
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
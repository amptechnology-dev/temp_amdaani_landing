"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Bell, Sun, Moon, User, ChevronDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { debounce } from "lodash";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Topbar({ theme }) {
  const { theme: currentTheme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Debounced search function
  const handleSearch = useCallback(
    debounce((query) => {
      // Implement search functionality
      console.log("Searching for:", query);
    }, 500),
    []
  );

  useEffect(() => {
    handleSearch(searchQuery);
    return () => handleSearch.cancel();
  }, [searchQuery, handleSearch]);

  const handleProfileClick = () => {
    // Navigate to profile
    window.location.href = "/profile";
  };

  return (
    <header className={`sticky top-0 z-40 ${theme.surface} shadow-sm`}>
      <div className="px-4 md:px-6 py-3">
        {/* Breadcrumb Section - Visible on desktop, hidden on mobile */}
        <div className="hidden md:block mb-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className={theme.text}>
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className={theme.textSecondary}>Overview</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center justify-between">
          {/* Left: Sidebar trigger & search */}
          <div className="flex items-center space-x-2 md:space-x-4 flex-1">
            {/* Sidebar trigger - visible on all screen sizes */}
            <SidebarTrigger
              className={`${theme.buttonTertiary} p-2 rounded-lg`}
            />
          </div>

          {/* Right: Controls */}
          <div className="flex items-center space-x-3 ml-4">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${theme.buttonTertiary}`}
              aria-label={`Switch to ${
                currentTheme === "light" ? "dark" : "light"
              } mode`}
            >
              {currentTheme === "light" ? (
                <Moon size={20} className={theme.text} />
              ) : (
                <Sun size={20} className={theme.text} />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg ${theme.buttonTertiary} relative`}
                aria-label="Notifications"
              >
                <Bell size={20} className={theme.text} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  className={`absolute right-0 mt-2 w-80 ${theme.card} rounded-lg shadow-xl border ${theme.outline} py-2`}
                >
                  <div className="px-4 py-2 border-b">
                    <h3 className={`${theme.text} font-semibold`}>
                      Notifications
                    </h3>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className={theme.textSecondary}>
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

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-opacity-10 hover:bg-gray-500"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User size={20} className="text-gray-600" />
                </div>
                <span className={`hidden md:inline ${theme.text} font-medium`}>
                  {user?.name || "User"}
                </span>
                <ChevronDown size={16} className={theme.textSecondary} />
              </button>

              {showUserMenu && (
                <div
                  className={`absolute right-0 mt-2 w-48 ${theme.card} rounded-lg shadow-xl border ${theme.outline} py-1`}
                >
                  <button
                    onClick={handleProfileClick}
                    className={`w-full text-left px-4 py-2 hover:${theme.surfaceVariant} ${theme.text}`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      // Implement logout
                      window.location.href = "/auth/logout";
                    }}
                    className={`w-full text-left px-4 py-2 hover:${theme.surfaceVariant} ${theme.text}`}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

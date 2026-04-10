"use client";

import Topbar from "../../../components/dashboard/TopBar";
import { useTheme } from "../../../context/ThemeContext";
import { themeConfig } from "../../../utils/ThemeConfig";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function DashboardLayout({ children }) {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full ${currentTheme.background}`}>
        {/* LEFT SIDEBAR */}
        <AppSidebar />

        {/* RIGHT CONTENT AREA - Takes full remaining width */}
        <SidebarInset className="w-full">
          <div className="flex flex-col w-full h-screen">
            {/* TOP BAR */}
            <Topbar theme={currentTheme} />

            {/* PAGE CONTENT */}
            <main className="flex-1 w-full overflow-y-auto p-4">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

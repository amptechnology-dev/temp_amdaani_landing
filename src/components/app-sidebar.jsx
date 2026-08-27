"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileBarChart,
  Settings,
  LogOut,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../../context/AuthContext";
import { sections, reportSubItems, isItemVisible } from "../lib/navigation";

const user = { name: "AMDAANI", email: "m@example.com" };

export function AppSidebar({ ...props }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isStockEnabled, isPurchaseOrderEnabled } = useAuth();

  const flags = { isStockEnabled, isPurchaseOrderEnabled };

  const visibleReportItems = React.useMemo(
    () => reportSubItems.filter((item) => isItemVisible(item, flags)),
    [isStockEnabled, isPurchaseOrderEnabled],
  );

  const isReportsActive = pathname?.startsWith("/dashboard/reports");
  const [reportsOpen, setReportsOpen] = React.useState(isReportsActive);

  React.useEffect(() => {
    if (isReportsActive) setReportsOpen(true);
  }, [isReportsActive]);

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="border-r border-slate-200 bg-gradient-to-b from-white via-slate-50/40 to-slate-50/60 shadow-[4px_0_24px_-8px_rgba(15,23,42,0.08)]"
    >
      {/* ---------------- HEADER ---------------- */}
      <SidebarHeader className="border-b border-slate-200/80 bg-white/60 backdrop-blur-sm px-3 py-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-white shrink-0 shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <Image
              src="/images/Tapplogo.png"
              alt="AMDAANI logo"
              fill
              className="object-contain p-1.5"
              sizes="44px"
              priority
            />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
            <span className="font-black text-[19px] text-slate-900 tracking-tight leading-none truncate">
              AMDAANI
            </span>
            <span className="text-[11px] font-medium text-slate-400 mt-1 tracking-wide">
              Free plan
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* ---------------- NAV ---------------- */}
      <SidebarContent className="px-2.5 py-3 gap-0.5">
        {sections.map((section, sIdx) => {
          const visibleItems = section.items.filter((item) =>
            isItemVisible(item, flags),
          );
          const showReportsRow = section.label === "Reports & Insights";
          const hasReportsContent = showReportsRow;

          if (visibleItems.length === 0 && !hasReportsContent) return null;

          return (
            <React.Fragment key={section.label}>
              <SidebarGroup className="py-1">
                <SidebarGroupLabel className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                  {section.label}
                </SidebarGroupLabel>
                <SidebarMenu className="gap-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.url ||
                      (item.url !== "/dashboard" &&
                        pathname?.startsWith(item.url));

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => router.push(item.url)}
                          isActive={isActive}
                          tooltip={item.title}
                          className={`relative h-10 rounded-xl px-3 transition-all duration-150 cursor-pointer border ${
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-300/50 border-blue-700/30"
                              : "text-slate-600 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm hover:text-slate-900"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3.5px] rounded-full bg-white group-data-[collapsible=icon]:hidden" />
                          )}
                          <item.icon
                            className={`w-[18px] h-[18px] shrink-0 ${
                              isActive ? "!text-white" : "text-slate-500"
                            }`}
                            strokeWidth={2.2}
                          />
                          <span
                            className={`font-semibold text-[13.5px] ${
                              isActive ? "!text-white" : "text-slate-700"
                            }`}
                          >
                            {item.title}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {showReportsRow && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setReportsOpen((prev) => !prev)}
                        isActive={isReportsActive}
                        tooltip="Reports"
                        className={`relative h-10 rounded-xl px-3 transition-all duration-150 cursor-pointer border ${
                          isReportsActive
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-300/50 border-blue-700/30"
                            : "text-slate-600 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm hover:text-slate-900"
                        }`}
                      >
                        {isReportsActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3.5px] rounded-full bg-white group-data-[collapsible=icon]:hidden" />
                        )}
                        <FileBarChart
                          className={`w-[18px] h-[18px] shrink-0 ${isReportsActive ? "!text-white" : "text-slate-500"}`}
                          strokeWidth={2.2}
                        />
                        <span
                          className={`font-semibold text-[13.5px] ${isReportsActive ? "!text-white" : "text-slate-700"}`}
                        >
                          Reports
                        </span>
                        <ChevronRight
                          className={`ml-auto w-4 h-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${
                            reportsOpen ? "rotate-90" : ""
                          } ${isReportsActive ? "!text-white" : "text-slate-500"}`}
                          strokeWidth={2.2}
                        />
                      </SidebarMenuButton>

                      {reportsOpen && (
                        <SidebarMenuSub className="mt-0.5 ml-3.5 pl-3 border-l-2 border-slate-200 gap-0.5 group-data-[collapsible=icon]:hidden">
                          {visibleReportItems.map((item) => {
                            const isSubActive = pathname === item.url;
                            return (
                              <SidebarMenuSubItem key={item.key}>
                                <SidebarMenuSubButton
                                  onClick={() => router.push(item.url)}
                                  isActive={isSubActive}
                                  className={`h-8 rounded-lg px-2.5 text-[13px] font-semibold transition-all duration-150 cursor-pointer border ${
                                    isSubActive
                                      ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                                      : "text-slate-600 border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-900"
                                  }`}
                                >
                                  <item.icon
                                    className={`w-[15px] h-[15px] shrink-0 ${isSubActive ? "text-blue-600" : "text-slate-500"}`}
                                    strokeWidth={2.2}
                                  />
                                  <span className="truncate">{item.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroup>

              {sIdx < sections.length - 1 && (
                <SidebarSeparator className="my-1 bg-slate-200/70" />
              )}
            </React.Fragment>
          );
        })}
      </SidebarContent>

      {/* ---------------- FOOTER ---------------- */}
      <SidebarFooter className="border-t border-slate-200/80 bg-white/60 backdrop-blur-sm px-2.5 py-2.5">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-13 rounded-xl px-2.5 mt-1 hover:bg-white hover:shadow-sm data-[state=open]:bg-white data-[state=open]:shadow-sm border border-transparent hover:border-slate-200 cursor-pointer transition-all duration-150"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-slate-200 shrink-0 bg-white">
                    <AvatarImage
                      src="/images/Tapplogo.png"
                      alt={user.name}
                      className="object-contain p-1 bg-white"
                    />
                    <AvatarFallback className="rounded-lg bg-blue-600 text-white text-xs font-bold">
                      {user.name?.slice(0, 2)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden min-w-0">
                    <span className="truncate font-bold text-[13.5px] text-slate-800">
                      {user.name}
                    </span>
                    <span className="truncate text-[11.5px] text-slate-400">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto w-4 h-4 text-slate-300 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-xl"
                side="top"
                align="start"
              >
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/settings")}
                  className="gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
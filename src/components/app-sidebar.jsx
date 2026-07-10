"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Package,
  ShoppingCart,
  Plus,
  Settings,
  FileText,
  X,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LogOut, ChevronsUpDown } from "lucide-react";

// -----------------------------------------
// Nav data — mobile app er bottom-tab structure onujayi
// -----------------------------------------
const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Invoices", url: "/dashboard/sales", icon: Receipt },
  { title: "Purchase", url: "/dashboard/purchase", icon: ShoppingCart },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Items", url: "/dashboard/items", icon: Package },
];

// ✅ mobile FAB expand menu er 3-ta option — icons hubohu same rakha holo
const quickActions = [
  {
    label: "Create Invoice",
    url: "/dashboard/sales?new=true",
    icon: FileText,
  },
  {
    label: "Create Item",
    url: "/dashboard/items?new=true",
    icon: Package,
  },
  {
    label: "Create Purchase",
    url: "/dashboard/purchase?new=true",
    icon: ShoppingCart,
  },
];

const user = {
  name: "AMDAANI",
  email: "m@example.com",
  avatar: "/avatars/shadcn.jpg",
};

export function AppSidebar({ ...props }) {
  const pathname = usePathname();
  const router = useRouter();
  const [fabOpen, setFabOpen] = React.useState(false);
  const closeTimer = React.useRef(null);

  const handleFabEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setFabOpen(true);
  };

  const handleFabLeave = () => {
    closeTimer.current = setTimeout(() => setFabOpen(false), 200);
  };

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-slate-200">
      {/* ---------------- HEADER ---------------- */}
      <SidebarHeader className="border-b border-slate-100 px-3 py-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-black text-lg text-slate-900 tracking-tight leading-none">
              AMDAANI
            </span>
            <span className="text-xs text-slate-400 mt-0.5">Free plan</span>
          </div>
        </div>
      </SidebarHeader>

      {/* ---------------- NAV ITEMS ---------------- */}
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">
            Menu
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.url ||
                (item.url !== "/dashboard" && pathname?.startsWith(item.url));

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => router.push(item.url)}
                    isActive={isActive}
                    tooltip={item.title}
                    className={`h-11 rounded-xl px-3 transition-all ${
                      isActive
                        ? "bg-blue-600 text-white hover:bg-blue-600 hover:text-white shadow-sm shadow-blue-200"
                        : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    <item.icon
                      className={`w-[18px] h-[18px] ${
                        isActive ? "text-white" : "text-slate-500"
                      }`}
                    />
                    <span className="font-medium text-sm">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* ---------------- QUICK ACTION — "+" hover korle 3-ta option popup hobe ---------------- */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1">
            Quick Action
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <div
                className="relative"
                onMouseEnter={handleFabEnter}
                onMouseLeave={handleFabLeave}
              >
                {/* Trigger button */}
                <SidebarMenuButton
                  onClick={() => setFabOpen((v) => !v)}
                  tooltip="Quick Create"
                  className={`h-11 rounded-xl px-3 border transition-all ${
                    fabOpen
                      ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-600 hover:text-white"
                      : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 hover:text-blue-700"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-transform duration-300 ${
                      fabOpen ? "bg-white rotate-135" : "bg-blue-600"
                    }`}
                  >
                    {fabOpen ? (
                      <X className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <span className="font-semibold text-sm">Quick Create</span>
                </SidebarMenuButton>

                {/* ✅ Expand popup — 3 rounded pill options, mobile FAB er moto */}
                {fabOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 flex flex-col gap-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/60 group-data-[collapsible=icon]:left-full group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:ml-2 group-data-[collapsible=icon]:w-48">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => {
                          setFabOpen(false);
                          router.push(action.url);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
                      >
                        <action.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ---------------- FOOTER ---------------- */}
      <SidebarFooter className="border-t border-slate-100 px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => router.push("/dashboard/settings")}
              className="h-10 rounded-xl px-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
              tooltip="Settings"
            >
              <Settings className="w-[18px] h-[18px] text-slate-500" />
              <span className="font-medium text-sm">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-14 rounded-xl px-2.5 mt-1 hover:bg-slate-50 data-[state=open]:bg-slate-50"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-slate-200">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-blue-600 text-white text-xs font-bold">
                      {user.name?.slice(0, 2)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold text-sm text-slate-800">
                      {user.name}
                    </span>
                    <span className="truncate text-xs text-slate-400">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto w-4 h-4 text-slate-400 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-xl"
                side="top"
                align="start"
              >
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/settings")}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600">
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
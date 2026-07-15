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
// Nav data
// -----------------------------------------
const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Purchase", url: "/dashboard/purchase", icon: ShoppingCart },
  { title: "Invoices", url: "/dashboard/sales", icon: Receipt },
  { title: "Customers", url: "/dashboard/customers", icon: Users },
  { title: "Items", url: "/dashboard/items", icon: Package },
];

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
  avatar: "/image/Tapplogo.png",
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
    <Sidebar
      collapsible="icon"
      {...props}
      className="border-r border-slate-200/80 bg-white"
    >
      {/* ---------------- HEADER ---------------- */}
      <SidebarHeader className="border-b border-slate-100 px-3 py-4">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shrink-0 shadow-sm shadow-blue-200/60 ring-1 ring-blue-700/10">
            <Package
              className="w-[18px] h-[18px] text-white"
              strokeWidth={2.25}
            />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
            <span className="font-black text-[17px] text-slate-900 tracking-tight leading-none truncate">
              AMDAANI
            </span>
            <span className="text-[11px] font-medium text-slate-400 mt-1 tracking-wide">
              Free plan
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* ---------------- NAV ITEMS ---------------- */}
      <SidebarContent className="px-2.5 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
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
                    className={`relative h-11 rounded-xl px-3 transition-all duration-150 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-600/95 text-white hover:from-blue-600 hover:to-blue-600/95 hover:text-white shadow-sm shadow-blue-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-white/90 group-data-[collapsible=icon]:hidden" />
                    )}
                    <item.icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        isActive ? "text-white" : "text-slate-400"
                      }`}
                      strokeWidth={2}
                    />
                    <span className="font-semibold text-[13.5px]">
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ---------------- FOOTER ---------------- */}
      <SidebarFooter className="border-t border-slate-100 px-2.5 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => router.push("/dashboard/settings")}
              className="h-10 rounded-xl px-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              tooltip="Settings"
            >
              <Settings
                className="w-[18px] h-[18px] text-slate-400"
                strokeWidth={2}
              />
              <span className="font-semibold text-[13.5px]">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-14 rounded-xl px-2.5 mt-1.5 hover:bg-slate-50 data-[state=open]:bg-slate-50 border border-transparent hover:border-slate-100"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-slate-200 shrink-0">
                    <AvatarImage
                      src="/image/Tapplogo.png"
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

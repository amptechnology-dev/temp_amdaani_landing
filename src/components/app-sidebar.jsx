"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Package,
  ShoppingCart,
  Settings,
  FileText,
  ChevronRight,
  TrendingUp,
  PackageSearch,
  BarChart3,
  Wallet,
  FileBarChart,
  PieChart,
  Landmark,
  UserCheck,
  BookOpen,
  MessageSquareHeart,
  LifeBuoy,
  ShieldCheck,
  Building2,
  CreditCard,
  LogOut,
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

// -----------------------------------------
// Reports sub-items
// -----------------------------------------
const reportSubItems = [
  {
    title: "Sales Report",
    url: "/dashboard/reports/sales",
    icon: TrendingUp,
    key: "sales",
  },
  {
    title: "Product Report",
    url: "/dashboard/reports/products",
    icon: Package,
    key: "products",
  },
  {
    title: "Product Wise Sales",
    url: "/dashboard/reports/product-wise-sales",
    icon: BarChart3,
    key: "productWiseSales",
  },
  {
    title: "Expense Report",
    url: "/dashboard/reports/expenses",
    icon: Wallet,
    key: "expenses",
  },
  {
    title: "GST Report",
    url: "/dashboard/reports/gst",
    icon: FileBarChart,
    key: "gst",
  },
  {
    title: "Stock Report",
    url: "/dashboard/reports/stock",
    icon: PackageSearch,
    key: "stock",
    requiresStock: true,
  },
  {
    title: "Profit & Loss Report",
    url: "/dashboard/reports/profit-loss",
    icon: PieChart,
    key: "profitLoss",
  },
  {
    title: "Purchase Report",
    url: "/dashboard/reports/purchase",
    icon: ShoppingCart,
    key: "purchase",
    requiresPurchaseOrder: true,
  },
  {
    title: "Creditors Report",
    url: "/dashboard/reports/creditors",
    icon: Landmark,
    key: "creditors",
  },
  {
    title: "Debtors Report",
    url: "/dashboard/reports/debtors",
    icon: UserCheck,
    key: "debtors",
  },
];

// -----------------------------------------
// Grouped sections — mirrors the RN Menu.js structure
// -----------------------------------------
const sections = [
  {
    label: "Menu",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Master",
    items: [
      { title: "Items", url: "/dashboard/items", icon: Package },
      {
        title: "Vendors",
        url: "/dashboard/vendors",
        icon: Users,
        requiresPurchaseOrder: true,
      },
      { title: "Customers", url: "/dashboard/customers", icon: Users },
    ],
  },
  {
    label: "Billing & Other Expenses",
    items: [
      {
        title: "Purchase",
        url: "/dashboard/purchase",
        icon: ShoppingCart,
        requiresPurchaseOrder: true,
      },
      { title: "Invoices", url: "/dashboard/sales", icon: Receipt },
      { title: "Other Expenses", url: "/dashboard/expenses", icon: Wallet },
    ],
  },
  {
    label: "Reports & Insights",
    items: [
      {
        title: "All Transactions",
        url: "/dashboard/transactions",
        icon: FileText,
      },
    ],
  },
  {
    label: "Business Setup",
    items: [
      { title: "Business Profile", url: "/dashboard/profile", icon: Building2 },
      {
        title: "Print Preference",
        url: "/dashboard/print-preference",
        icon: FileText,
      },
    ],
  },
  {
    label: "Subscriptions",
    items: [
      { title: "Plans & Pricing", url: "/dashboard/pricing", icon: CreditCard },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        title: "Our Products",
        url: "/dashboard/products",
        icon: PackageSearch,
      },
      { title: "How to Use", url: "/dashboard/how-to-use", icon: BookOpen },
      {
        title: "Give Feedback",
        url: "/dashboard/feedback",
        icon: MessageSquareHeart,
      },
    ],
  },
  {
    label: "Support",
    items: [
      { title: "Help & Support", url: "/dashboard/support", icon: LifeBuoy },
      {
        title: "Privacy Policy",
        url: "/dashboard/privacy-policy",
        icon: ShieldCheck,
      },
    ],
  },
];

const user = {
  name: "AMDAANI",
  email: "m@example.com",
};

// Checks whether an item/section should be visible based on its requires* flags
function isItemVisible(item, { isStockEnabled, isPurchaseOrderEnabled }) {
  if (item.requiresStock && !isStockEnabled) return false;
  if (item.requiresPurchaseOrder && !isPurchaseOrderEnabled) return false;
  return true;
}

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
      className="border-r border-slate-200/70 bg-white"
    >
      {/* ---------------- HEADER (bigger logo) ---------------- */}
      <SidebarHeader className="border-b border-slate-100 px-3 py-5">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-white shrink-0 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
            <Image
              src="/images/Tapplogo.png"
              alt="AMDAANI logo"
              fill
              className="object-contain p-1.5"
              sizes="48px"
              priority
            />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
            <span className="font-black text-[19px] text-slate-900 tracking-tight leading-none truncate">
              AMDAANI
            </span>
            <span className="text-[11px] font-medium text-slate-400 mt-1.5 tracking-wide">
              Free plan
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* ---------------- NAV (grouped like the RN Menu) ---------------- */}
      <SidebarContent className="px-2.5 py-4">
        {sections.map((section, sIdx) => {
          const visibleItems = section.items.filter((item) =>
            isItemVisible(item, flags),
          );

          const showReportsRow = section.label === "Reports & Insights";
          const hasReportsContent = showReportsRow; // Reports row itself always shows if section exists

          if (visibleItems.length === 0 && !hasReportsContent) return null;

          return (
            <React.Fragment key={section.label}>
              <SidebarGroup>
                <SidebarGroupLabel className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                  {section.label}
                </SidebarGroupLabel>
                <SidebarMenu className="gap-1">
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
                          className={`relative h-11 rounded-xl px-3 transition-all duration-150 ${
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-blue-600/95 hover:from-blue-600 hover:to-blue-600/95 shadow-sm shadow-blue-200"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-white/90 group-data-[collapsible=icon]:hidden" />
                          )}
                          <item.icon
                            className={`w-[18px] h-[18px] shrink-0 ${
                              isActive ? "!text-white" : "text-slate-400"
                            }`}
                            strokeWidth={2}
                          />
                          <span
                            className={`font-semibold text-[13.5px] ${
                              isActive ? "!text-white" : ""
                            }`}
                          >
                            {item.title}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {/* Reports (collapsible) sits inside "Reports & Insights" */}
                  {showReportsRow && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setReportsOpen((prev) => !prev)}
                        isActive={isReportsActive}
                        tooltip="Reports"
                        className={`relative h-11 rounded-xl px-3 transition-all duration-150 ${
                          isReportsActive
                            ? "bg-gradient-to-r from-blue-600 to-blue-600/95 hover:from-blue-600 hover:to-blue-600/95 shadow-sm shadow-blue-200"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {isReportsActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-white/90 group-data-[collapsible=icon]:hidden" />
                        )}
                        <FileBarChart
                          className={`w-[18px] h-[18px] shrink-0 ${
                            isReportsActive ? "!text-white" : "text-slate-400"
                          }`}
                          strokeWidth={2}
                        />
                        <span
                          className={`font-semibold text-[13.5px] ${
                            isReportsActive ? "!text-white" : ""
                          }`}
                        >
                          Reports
                        </span>
                        <ChevronRight
                          className={`ml-auto w-4 h-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${
                            reportsOpen ? "rotate-90" : ""
                          } ${isReportsActive ? "!text-white" : "text-slate-400"}`}
                          strokeWidth={2}
                        />
                      </SidebarMenuButton>

                      {reportsOpen && (
                        <SidebarMenuSub className="mt-1 ml-3.5 pl-3 border-l border-slate-100 gap-0.5 group-data-[collapsible=icon]:hidden">
                          {visibleReportItems.map((item) => {
                            const isSubActive = pathname === item.url;
                            return (
                              <SidebarMenuSubItem key={item.key}>
                                <SidebarMenuSubButton
                                  onClick={() => router.push(item.url)}
                                  isActive={isSubActive}
                                  className={`h-9 rounded-lg px-2.5 text-[13px] font-medium transition-all duration-150 ${
                                    isSubActive
                                      ? "bg-blue-50 text-blue-700"
                                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                  }`}
                                >
                                  <item.icon
                                    className={`w-[15px] h-[15px] shrink-0 ${
                                      isSubActive
                                        ? "text-blue-600"
                                        : "text-slate-400"
                                    }`}
                                    strokeWidth={2}
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
                <SidebarSeparator className="my-2.5" />
              )}
            </React.Fragment>
          );
        })}
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
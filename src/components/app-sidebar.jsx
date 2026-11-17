"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { FileBarChart, ChevronRight, Crown } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
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
import { useAuth } from "../../context/AuthContext";
import { sections, reportSubItems, isItemVisible } from "../lib/navigation";

// STAFF role-er jonno ei item gulo sidebar-e dekhabe na.
// Item-er url ba title e ei word thakle hide hobe.
// (Vendors / Purchase navigation.js-e `hideForStaff: true` diye handle kora)
const STAFF_HIDDEN_PATTERNS = [/staff/i, /login[-_\s]?activit/i];

const isHiddenForStaff = (item) =>
  STAFF_HIDDEN_PATTERNS.some(
    (re) => re.test(item?.url || "") || re.test(item?.title || ""),
  );

// Plan-e feature na thakle ei premium badge dekhabe
function PremiumBadge({ small = false }) {
  return (
    <span
      title="Premium feature"
      className={`ml-auto shrink-0 flex items-center justify-center rounded-md bg-amber-50 ring-1 ring-amber-200/80 group-data-[collapsible=icon]:hidden ${
        small ? "w-[18px] h-[18px]" : "w-5 h-5"
      }`}
    >
      <Crown
        className={`text-amber-500 ${small ? "w-2.5 h-2.5" : "w-3 h-3"}`}
        fill="currentColor"
        strokeWidth={1.75}
      />
    </span>
  );
}

const baseBtn =
  "relative h-10 rounded-xl px-3 transition-all duration-200 cursor-pointer border";
const activeBtn =
  "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/25 border-blue-700/30";
const idleBtn =
  "text-slate-600 border-transparent hover:bg-slate-100/80 hover:text-slate-900";

export function AppSidebar({ ...props }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isStockEnabled,
    isPurchaseOrderEnabled,
    isStaff,
    hasFeature,
    guardFeature,
    subscription,
  } = useAuth();

  const flags = { isStockEnabled, isPurchaseOrderEnabled, isStaff };

  const canSee = React.useCallback(
    (item) => {
      if (isStaff && isHiddenForStaff(item)) return false;
      if (item.hideForStaff && isStaff) return false;

      // Plan-e feature nai → locked obosthay dekhao (click korle popup)
      if (item.feature && !hasFeature(item.feature)) return true;

      return isItemVisible(item, flags);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isStockEnabled, isPurchaseOrderEnabled, isStaff, subscription],
  );

  const visibleReportItems = React.useMemo(
    () => reportSubItems.filter(canSee),
    [canSee],
  );

  const isReportsActive = pathname?.startsWith("/dashboard/reports");
  const [reportsOpen, setReportsOpen] = React.useState(isReportsActive);

  React.useEffect(() => {
    if (isReportsActive) setReportsOpen(true);
  }, [isReportsActive]);

  const reportsLocked = !hasFeature("reports");

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="border-r border-slate-200/80 bg-gradient-to-b from-white via-slate-50/50 to-slate-50 shadow-[4px_0_24px_-8px_rgba(15,23,42,0.08)]"
    >
      {/* ---------------- HEADER ---------------- */}
      <SidebarHeader className="relative border-b border-slate-200/80 bg-gradient-to-b from-blue-50/60 to-white px-3 py-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-white shrink-0 shadow-md shadow-blue-500/10 ring-1 ring-slate-200 overflow-hidden">
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
          </div>
        </div>
      </SidebarHeader>

      {/* ---------------- NAV ---------------- */}
      <SidebarContent className="px-2.5 py-3 gap-0.5 pb-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
        {sections.map((section, sIdx) => {
          const visibleItems = section.items.filter(canSee);
          const showReportsRow = section.label === "Reports & Insights";
          const hasReportsContent = showReportsRow;

          if (visibleItems.length === 0 && !hasReportsContent) return null;

          return (
            <React.Fragment key={section.label}>
              <SidebarGroup className="py-1">
                <SidebarGroupLabel className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.08em] px-2 mb-1.5">
                  <span className="h-1 w-1 rounded-full bg-blue-400/70 group-data-[collapsible=icon]:hidden" />
                  {section.label}
                </SidebarGroupLabel>
                <SidebarMenu className="gap-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.url ||
                      (item.url !== "/dashboard" &&
                        pathname?.startsWith(item.url));
                    const isLocked = item.feature && !hasFeature(item.feature);
                    const active = isActive && !isLocked;

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => {
                            if (item.feature && !guardFeature(item.feature))
                              return;
                            router.push(item.url);
                          }}
                          isActive={active}
                          tooltip={item.title}
                          className={`${baseBtn} ${active ? activeBtn : idleBtn}`}
                        >
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3.5px] rounded-r-full bg-white group-data-[collapsible=icon]:hidden" />
                          )}
                          <item.icon
                            className={`w-[18px] h-[18px] shrink-0 ${
                              active ? "!text-white" : "text-slate-500"
                            }`}
                            strokeWidth={2.2}
                          />
                          <span
                            className={`font-semibold text-[13.5px] ${
                              active
                                ? "!text-white"
                                : isLocked
                                  ? "text-slate-500"
                                  : "text-slate-700"
                            }`}
                          >
                            {item.title}
                          </span>
                          {isLocked && <PremiumBadge />}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {showReportsRow && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          if (!guardFeature("reports")) return;
                          setReportsOpen((prev) => !prev);
                        }}
                        isActive={isReportsActive && !reportsLocked}
                        tooltip="Reports"
                        className={`${baseBtn} ${
                          isReportsActive && !reportsLocked
                            ? activeBtn
                            : idleBtn
                        }`}
                      >
                        {isReportsActive && !reportsLocked && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3.5px] rounded-r-full bg-white group-data-[collapsible=icon]:hidden" />
                        )}
                        <FileBarChart
                          className={`w-[18px] h-[18px] shrink-0 ${
                            isReportsActive && !reportsLocked
                              ? "!text-white"
                              : "text-slate-500"
                          }`}
                          strokeWidth={2.2}
                        />
                        <span
                          className={`font-semibold text-[13.5px] ${
                            isReportsActive && !reportsLocked
                              ? "!text-white"
                              : reportsLocked
                                ? "text-slate-500"
                                : "text-slate-700"
                          }`}
                        >
                          Reports
                        </span>
                        {reportsLocked ? (
                          <PremiumBadge />
                        ) : (
                          <ChevronRight
                            className={`ml-auto w-4 h-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${
                              reportsOpen ? "rotate-90" : ""
                            } ${
                              isReportsActive ? "!text-white" : "text-slate-500"
                            }`}
                            strokeWidth={2.2}
                          />
                        )}
                      </SidebarMenuButton>

                      {reportsOpen && !reportsLocked && (
                        <SidebarMenuSub className="mt-1 ml-[22px] pl-3 border-l-2 border-slate-200 gap-0.5 group-data-[collapsible=icon]:hidden">
                          {visibleReportItems.map((item) => {
                            const isSubActive = pathname === item.url;
                            const isSubLocked =
                              item.feature && !hasFeature(item.feature);
                            const subActive = isSubActive && !isSubLocked;

                            return (
                              <SidebarMenuSubItem key={item.key}>
                                <SidebarMenuSubButton
                                  onClick={() => {
                                    if (
                                      item.feature &&
                                      !guardFeature(item.feature)
                                    )
                                      return;
                                    router.push(item.url);
                                  }}
                                  isActive={subActive}
                                  className={`h-auto min-h-8 py-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-all duration-150 cursor-pointer border items-start ${
                                    subActive
                                      ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                                      : "text-slate-600 border-transparent hover:bg-slate-100/80 hover:text-slate-900"
                                  }`}
                                >
                                  <item.icon
                                    className={`w-[15px] h-[15px] shrink-0 mt-0.5 ${
                                      subActive
                                        ? "text-blue-600"
                                        : "text-slate-500"
                                    }`}
                                    strokeWidth={2.2}
                                  />
                                  <span className="whitespace-normal leading-snug">
                                    {item.title}
                                  </span>
                                  {isSubLocked && <PremiumBadge small />}
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

      <SidebarRail />
    </Sidebar>
  );
}
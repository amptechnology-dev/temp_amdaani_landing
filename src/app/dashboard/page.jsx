"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import {
  format,
  startOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { RefreshCw, Plus } from "lucide-react";

import MetricCard from "../../../components/dashboard/MetricCard";
import ChartCard from "../../../components/dashboard/ChartCard";
import SummaryPanel from "../../../components/dashboard/SummaryPanel";
import TopCustomers from "../../../components/dashboard/TopCustomers";
import TopProducts from "../../../components/dashboard/TopProducts";
import RecentActivity from "../../../components/dashboard/RecentActivity";
import CarouselSlider from "../../../components/dashboard/CarouselSlider";
import SkeletonGrid from "../../../components/dashboard/SkeletonGrid";

import { themeConfig } from "../../../utils/ThemeConfig";
import api from "../../../utils/api";

export default function DashboardPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState("month");
  const currentTheme = themeConfig[theme];

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");

      const [invoiceRes, productRes, dueRes, transactionRes] =
        await Promise.all([
          api.get("/invoice?limit=50000&status=active"),
          api.get("/product?limit=50000"),
          api.get("/customer/due?limit=20000"),
          api.get("/invoice/transactions", { params: { startDate } }),
        ]);

      const invoices = invoiceRes?.data?.docs || [];
      const products = productRes?.data?.docs || [];
      const dueCustomers = dueRes?.data?.docs || [];
      const transactions = transactionRes?.data || [];

      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");
      const currentYear = now.getFullYear();
      const thisMonthIndex = now.getMonth();

      const sumByKey = (arr, key) =>
        arr.reduce((acc, item) => acc + (Number(item?.[key]) || 0), 0);

      const invoicesThisYear = invoices.filter(
        (inv) => new Date(inv.invoiceDate).getFullYear() === currentYear,
      );
      const invoicesLastYear = invoices.filter(
        (inv) => new Date(inv.invoiceDate).getFullYear() === currentYear - 1,
      );

      const todayInvoices = invoices.filter(
        (inv) => format(new Date(inv.invoiceDate), "yyyy-MM-dd") === todayStr,
      );

      const thisMonthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return (
          d.getFullYear() === currentYear && d.getMonth() === thisMonthIndex
        );
      });

      const prevMonthDate = subMonths(now, 1);
      const prevMonthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return (
          d.getFullYear() === prevMonthDate.getFullYear() &&
          d.getMonth() === prevMonthDate.getMonth()
        );
      });

      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

      const weeklyInvoices = invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return d >= weekStart && d <= weekEnd;
      });

      const annualSale = sumByKey(invoicesThisYear, "grandTotal");
      const lastYearSale = sumByKey(invoicesLastYear, "grandTotal");
      const annualGrowth =
        lastYearSale > 0
          ? ((annualSale - lastYearSale) / lastYearSale) * 100
          : 0;

      const monthlySale = sumByKey(thisMonthInvoices, "grandTotal");
      const lastMonthSale = sumByKey(prevMonthInvoices, "grandTotal");
      const monthlyGrowth =
        lastMonthSale > 0
          ? ((monthlySale - lastMonthSale) / lastMonthSale) * 100
          : 0;

      const weeklySale = sumByKey(weeklyInvoices, "grandTotal");
      const weeklyAvg =
        weeklyInvoices.length > 0 ? weeklySale / weeklyInvoices.length : 0;
      const todaySale = sumByKey(todayInvoices, "grandTotal");
      const todayMax =
        todayInvoices.length > 0
          ? Math.max(...todayInvoices.map((i) => Number(i.grandTotal || 0)))
          : 0;

      const metrics = {
        annualSale,
        lastYearSale,
        annualGrowth,
        annualInvoices: invoicesThisYear.length,

        monthlySale,
        lastMonthSale,
        monthlyGrowth,
        monthlyInvoices: thisMonthInvoices.length,

        weeklySale,
        weeklyInvoices: weeklyInvoices.length,
        weeklyAvg,

        todaySale,
        todayInvoices: todayInvoices.length,
        todayMax,
      };

      const topCustomers = {
        percentage: 100,
        sorted: dueCustomers
          .map((c) => ({
            customer: c.name || "Unknown",
            mobile: c.mobile,
            count: c.pendingInvoiceCount || 0,
            total: c.totalDue || 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };

      const topProducts = products
        .map((p) => ({
          name: p.name,
          category: p?.category?.name || "",
          revenue: (p.sellCount || 0) * (p.sellingPrice || 0),
          qty: p.sellCount || 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const dueSummary = {
        totalDue: sumByKey(dueCustomers, "totalDue"),
        totalCustomers: dueCustomers.length,
        totalPendingInvoices: dueCustomers.reduce(
          (acc, c) => acc + (c.pendingInvoiceCount || 0),
          0,
        ),
      };

      const receivedSummary = {
        totalReceived: sumByKey(transactions, "amount"),
      };

      const monthMap = new Map();
      invoices.forEach((inv) => {
        const d = new Date(inv.invoiceDate);
        const key = format(d, "MMM yyyy");
        const prev = monthMap.get(key) || 0;
        monthMap.set(key, prev + (inv.grandTotal || 0));
      });

      const monthlyRevenueData = Array.from(monthMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => new Date(a.name) - new Date(b.name))
        .slice(-6);

      const monthlyRevenue = { data: monthlyRevenueData };

      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const weeklyTrendData = weekDays.map((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const totalForDay = invoices.reduce((acc, inv) => {
          const invDay = format(new Date(inv.invoiceDate), "yyyy-MM-dd");
          return invDay === dayKey ? acc + (inv.grandTotal || 0) : acc;
        }, 0);
        return { name: format(day, "EEE"), value: totalForDay };
      });

      const weeklyTrend = { data: weeklyTrendData };

      const recentActivity = invoices
        .filter((inv) => inv.invoiceDate && !isNaN(new Date(inv.invoiceDate)))
        .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
        .slice(0, 5)
        .map((inv) => ({
          id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName || "Unknown",
          amount: inv.grandTotal,
          status: inv.paymentStatus,
          createdAt: inv.invoiceDate,
        }));

      return {
        metrics,
        dueSummary,
        receivedSummary,
        topCustomers,
        topProducts,
        monthlyRevenue,
        weeklyTrend,
        recentActivity,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!user,
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Error Loading Dashboard
          </h2>
          <p className="text-slate-400 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 👇 outer padding + vertical rhythm kome dewa hoyeche (p-4/6 -> p-3/4, space-y-5 -> space-y-3) */}
      <div className="max-w-7xl mx-auto p-3 md:p-4 space-y-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {format(new Date(), "MMMM dd, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            {/* ✅ Always-glowing animated New Invoice button (self-contained, no external CSS needed) */}
            <button
              onClick={() => router.push("/dashboard/sales?new=true")}
              className="new-invoice-btn relative flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-1.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.05] active:scale-[0.96]"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>

            <style jsx>{`
              .new-invoice-btn {
                box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.55);
                animation: newInvoiceGlow 1.8s ease-in-out infinite;
              }
              @keyframes newInvoiceGlow {
                0% {
                  box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.55);
                }
                50% {
                  box-shadow: 0 0 0 9px rgba(37, 99, 235, 0);
                }
                100% {
                  box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
                }
              }
            `}</style>
          </div>
        </div>

        {isLoading ? (
          <SkeletonGrid />
        ) : (
          <>
            {/* Key Metrics — gap-4 -> gap-3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                title="Annual Sales"
                value={dashboardData?.metrics?.annualSale || 0}
                growth={dashboardData?.metrics?.annualGrowth || 0}
                count={dashboardData?.metrics?.annualInvoices || 0}
                subtitle="vs last year"
                icon="calendar"
                color="blue"
                onClick={() =>
                  (window.location.href = "/reports/sales?period=annual")
                }
              />
              <MetricCard
                title="Monthly Sales"
                value={dashboardData?.metrics?.monthlySale || 0}
                growth={dashboardData?.metrics?.monthlyGrowth || 0}
                count={dashboardData?.metrics?.monthlyInvoices || 0}
                subtitle="vs last month"
                icon="calendarMonth"
                color="teal"
                onClick={() =>
                  (window.location.href = "/reports/sales?period=monthly")
                }
              />
              <MetricCard
                title="Weekly Sales"
                value={dashboardData?.metrics?.weeklySale || 0}
                count={dashboardData?.metrics?.weeklyInvoices || 0}
                avg={dashboardData?.metrics?.weeklyAvg || 0}
                icon="calendarWeek"
                color="amber"
                onClick={() =>
                  (window.location.href = "/reports/sales?period=weekly")
                }
              />
              <MetricCard
                title="Today's Sales"
                value={dashboardData?.metrics?.todaySale || 0}
                count={dashboardData?.metrics?.todayInvoices || 0}
                max={dashboardData?.metrics?.todayMax || 0}
                icon="calendarToday"
                color="rose"
                onClick={() =>
                  (window.location.href = "/reports/sales?period=today")
                }
              />
            </div>

            {/* 👇 Ads/Carousel section — height chotoo kore wrap kora holo, border/overflow control korar jonno */}
            <div className="max-h-[140px] overflow-hidden rounded-xl border-0">
              <CarouselSlider />
            </div>

            <SummaryPanel
              dueSummary={dashboardData?.dueSummary}
              receivedSummary={dashboardData?.receivedSummary}
            />

            {/* gap-5 -> gap-3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard
                title="Monthly Revenue Trend"
                subtitle="Last 6 months"
                type="bar"
                data={dashboardData?.monthlyRevenue?.data || []}
                height={220}
              />
              <ChartCard
                title="Weekly Sales Trend"
                subtitle="Current week (Sun–Sat)"
                type="line"
                data={dashboardData?.weeklyTrend?.data || []}
                height={220}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <TopCustomers
                customers={dashboardData?.topCustomers?.sorted || []}
                percentage={dashboardData?.topCustomers?.percentage || 0}
              />
              <TopProducts products={dashboardData?.topProducts || []} />
            </div>

            <RecentActivity activities={dashboardData?.recentActivity || []} />
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
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
  const { user } = useAuth(); // AuthContext se user aa raha hai
  const [dateRange, setDateRange] = useState("month");
  const currentTheme = themeConfig[theme];

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      console.log("⚡ DASHBOARD QUERY FN CALLED");
      console.log("USER in dashboard:", user);

      // 🔹 Transactions ke liye current month ka 1st date
      const startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");

      const [invoiceRes, productRes, dueRes, transactionRes] =
        await Promise.all([
          api.get("/invoice?limit=50000&status=active"),
          api.get("/product?limit=50000"),
          api.get("/customer/due?limit=20000"),
          api.get("/invoice/transactions", { params: { startDate } }),
        ]);

      console.log("📌 RAW RESPONSES:", {
        invoiceRes,
        productRes,
        dueRes,
        transactionRes,
      });

      // A) invoices = invoiceRes.data.docs
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

      // ---------- FILTERS ----------
      const invoicesThisYear = invoices.filter(
        (inv) => new Date(inv.invoiceDate).getFullYear() === currentYear
      );
      const invoicesLastYear = invoices.filter(
        (inv) => new Date(inv.invoiceDate).getFullYear() === currentYear - 1
      );

      const todayInvoices = invoices.filter(
        (inv) => format(new Date(inv.invoiceDate), "yyyy-MM-dd") === todayStr
      );

      const thisMonthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return (
          d.getFullYear() === currentYear && d.getMonth() === thisMonthIndex
        );
      });

      // Previous month
      const prevMonthDate = subMonths(now, 1);
      const prevMonthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return (
          d.getFullYear() === prevMonthDate.getFullYear() &&
          d.getMonth() === prevMonthDate.getMonth()
        );
      });

      // Weekly: current week Sun–Sat
      const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // 0 = Sunday
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

      const weeklyInvoices = invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate);
        return d >= weekStart && d <= weekEnd;
      });

      // ---------- METRICS ----------
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
      const todaySale = sumByKey(todayInvoices, "grandTotal");

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

        todaySale,
        todayInvoices: todayInvoices.length,
      };

      // ---------- TOP CUSTOMERS ----------
      const topCustomers = {
        percentage: 100, // filhaal 100 rakhte hain
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

      // ---------- TOP PRODUCTS ----------
      const topProducts = products
        .map((p) => ({
          name: p.name,
          category: p?.category?.name || "",
          revenue: (p.sellCount || 0) * (p.sellingPrice || 0),
          qty: p.sellCount || 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // ---------- SUMMARY ----------
      const dueSummary = {
        totalDue: sumByKey(dueCustomers, "totalDue"),
        totalCustomers: dueCustomers.length,
        totalPendingInvoices: dueCustomers.reduce(
          (acc, c) => acc + (c.pendingInvoiceCount || 0),
          0
        ),
      };

      const receivedSummary = {
        totalReceived: sumByKey(transactions, "amount"),
      };

      // ---------- MONTHLY REVENUE (chart) ----------
      const monthMap = new Map(); // "Nov 2025" -> total

      invoices.forEach((inv) => {
        const d = new Date(inv.invoiceDate);
        const key = format(d, "MMM yyyy");
        const prev = monthMap.get(key) || 0;
        monthMap.set(key, prev + (inv.grandTotal || 0));
      });

      const monthlyRevenueData = Array.from(monthMap.entries())
        .map(([name, value]) => ({ name, value }))
        // sort by date again to keep order
        .sort((a, b) => {
          const da = new Date(a.name);
          const db = new Date(b.name);
          return da - db;
        });

      const monthlyRevenue = { data: monthlyRevenueData };

      // ---------- WEEKLY TREND (current Sun–Sat) ----------
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const weeklyTrendData = weekDays.map((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const totalForDay = invoices.reduce((acc, inv) => {
          const invDay = format(new Date(inv.invoiceDate), "yyyy-MM-dd");
          return invDay === dayKey ? acc + (inv.grandTotal || 0) : acc;
        }, 0);

        return {
          name: format(day, "dd MMM"),
          value: totalForDay,
        };
      });

      const weeklyTrend = { data: weeklyTrendData };

      // ---------- RECENT ACTIVITY ----------
      const recentActivity = invoices
        .filter((inv) => inv.invoiceDate && !isNaN(new Date(inv.invoiceDate)))
        .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
        .slice(0, 10)
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
    enabled: !!user, // sirf jab user loaded ho
  });

  console.log("DASHBOARD DATA →", dashboardData);
  console.log("ERROR →", error);
  console.log("LOADING →", isLoading);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className={`${currentTheme.card} p-8 rounded-2xl shadow-lg`}>
          <h2 className={`${currentTheme.text} text-xl font-semibold mb-4`}>
            Error Loading Dashboard
          </h2>
          <p className={`${currentTheme.textSecondary} mb-6`}>
            {error.message}
          </p>
          <button
            onClick={() => refetch()}
            className={`${currentTheme.buttonPrimary} px-4 py-2 rounded-lg font-medium`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className={`${currentTheme.text} text-2xl md:text-3xl font-bold`}>
            Dashboard Overview
          </h1>
          <p className={`${currentTheme.textSecondary} mt-1`}>
            {format(new Date(), "MMMM dd, yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className={`${currentTheme.card} ${currentTheme.text} ${currentTheme.outline} border rounded-lg px-3 py-2 text-sm`}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button
            onClick={() => refetch()}
            className={`${currentTheme.buttonSecondary} border rounded-lg px-4 py-2 text-sm font-medium`}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <MetricCard
              title="Annual Sales"
              value={dashboardData?.metrics?.annualSale || 0}
              previousValue={dashboardData?.metrics?.lastYearSale || 0}
              growth={dashboardData?.metrics?.annualGrowth || 0}
              count={dashboardData?.metrics?.annualInvoices || 0}
              period="year"
              icon="calendar-multiselect"
              color="primary"
              theme={currentTheme}
              onClick={() =>
                (window.location.href = "/reports/sales?period=annual")
              }
            />
            <MetricCard
              title="Monthly Sales"
              value={dashboardData?.metrics?.monthlySale || 0}
              previousValue={dashboardData?.metrics?.lastMonthSale || 0}
              growth={dashboardData?.metrics?.monthlyGrowth || 0}
              count={dashboardData?.metrics?.monthlyInvoices || 0}
              period="month"
              icon="calendar-month"
              color="secondary"
              theme={currentTheme}
              onClick={() =>
                (window.location.href = "/reports/sales?period=monthly")
              }
            />
            <MetricCard
              title="Weekly Sales"
              value={dashboardData?.metrics?.weeklySale || 0}
              previousValue={0}
              growth={0}
              count={dashboardData?.metrics?.weeklyInvoices || 0}
              period="week"
              icon="calendar-week"
              color="tertiary"
              theme={currentTheme}
              onClick={() =>
                (window.location.href = "/reports/sales?period=weekly")
              }
            />
            <MetricCard
              title="Today's Sales"
              value={dashboardData?.metrics?.todaySale || 0}
              previousValue={0}
              growth={0}
              count={dashboardData?.metrics?.todayInvoices || 0}
              period="day"
              icon="calendar-today"
              color="error"
              theme={currentTheme}
              onClick={() =>
                (window.location.href = "/reports/sales?period=today")
              }
            />
          </div>

          {/* Carousel Banner */}
          <CarouselSlider theme={currentTheme} />

          {/* Due & Received Summary */}
          <SummaryPanel
            dueSummary={dashboardData?.dueSummary}
            receivedSummary={dashboardData?.receivedSummary}
            theme={currentTheme}
          />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Monthly Revenue Trend"
              subtitle="Last few months"
              type="bar"
              data={dashboardData?.monthlyRevenue?.data || []}
              theme={currentTheme}
              height={300}
            />

            <ChartCard
              title="Weekly Sales Trend"
              subtitle="Current week (Sun–Sat)"
              type="line"
              data={dashboardData?.weeklyTrend?.data || []}
              theme={currentTheme}
              height={300}
            />
          </div>

          {/* Top Lists Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopCustomers
              customers={dashboardData?.topCustomers?.sorted || []}
              percentage={dashboardData?.topCustomers?.percentage || 0}
              theme={currentTheme}
            />

            <TopProducts
              products={dashboardData?.topProducts || []}
              theme={currentTheme}
            />
          </div>

          {/* Recent Activity */}
          <RecentActivity
            activities={dashboardData?.recentActivity || []}
            theme={currentTheme}
          />
        </>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { toast } from "sonner";

import {
  ArrowLeft,
  Crown,
  CreditCard,
  Calendar,
  CalendarClock,
  History,
  CheckCircle,
  Clock,
  XCircle,
  Hash,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const getStatusMeta = (status) => {
  switch (status?.toLowerCase()) {
    case "active":
    case "success":
    case "completed":
      return { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle };
    case "pending":
      return { color: "text-orange-600", bg: "bg-orange-50", icon: Clock };
    case "expired":
    case "failed":
      return { color: "text-red-600", bg: "bg-red-50", icon: XCircle };
    default:
      return { color: "text-slate-500", bg: "bg-slate-50", icon: Clock };
  }
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function ActivePlanDetailsPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get("/subscription/subscription-history");
      if (res.success && res.data) setData(res.data);
    } catch {
      toast.error("Failed to load plan details");
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0;
    const diff = new Date(endDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const filteredPayments =
    data?.payments?.filter((p) => statusFilter === "all" || p.status === statusFilter) || [];

  const filterCounts = {
    all: data?.payments?.length || 0,
    success: data?.payments?.filter((t) => t.status === "success").length || 0,
    pending: data?.payments?.filter((t) => t.status === "pending").length || 0,
    failed: data?.payments?.filter((t) => t.status === "failed").length || 0,
  };

  if (loading) {
    return (
      <div className={`min-h-screen w-full ${currentTheme.background}`}>
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const currentPlan = data?.currentPlan;
  const daysLeft = currentPlan ? getDaysRemaining(currentPlan.endDate) : 0;
  const progressPct = currentPlan
    ? Math.min(100, Math.round((daysLeft / (currentPlan.durationDays || 30)) * 100))
    : 0;

  return (
    <div className={`min-h-screen w-full ${currentTheme.background}`}>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/pricing")}>
            <Crown className="w-4 h-4 mr-2" />
            View Plans
          </Button>
        </div>

        <h1 className={`text-2xl font-bold ${currentTheme.text}`}>Plan Details</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 bg-slate-100 p-1 h-12 rounded-xl">
            <TabsTrigger
              value="overview"
              className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Transactions
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-slate-800">Current Plan</h2>
              </div>

              {currentPlan ? (
                <Card className="rounded-2xl border-2 border-blue-200">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-slate-800">
                        {currentPlan.planName} Plan
                      </h3>
                      <Badge className="bg-emerald-500">{currentPlan.status?.toUpperCase()}</Badge>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-[11px] text-slate-400">Plan Price</p>
                        <p className="font-bold text-slate-800">
                          ₹{currentPlan.price}
                          <span className="text-xs text-slate-400">/{currentPlan.durationDays}d</span>
                        </p>
                      </div>
                      <div className="text-center border-x border-slate-100">
                        <p className="text-[11px] text-slate-400">Invoice Limit</p>
                        <p className="font-bold text-slate-800">
                          {currentPlan.usageLimits?.unlimited ? "∞" : currentPlan.usageLimits?.invoices}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] text-slate-400">Days Left</p>
                        <p className={`font-bold ${daysLeft <= 7 ? "text-red-600" : "text-emerald-600"}`}>
                          {daysLeft}d
                        </p>
                      </div>
                    </div>

                    <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full ${daysLeft <= 7 ? "bg-red-500" : "bg-blue-500"}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 text-right mb-3">{progressPct}% remaining</p>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Start: {formatDate(currentPlan.startDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        End: {formatDate(currentPlan.endDate)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-2xl border-slate-200">
                  <CardContent className="p-8 text-center text-slate-400">
                    No active plan found
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Previous Plans */}
            {data?.previousPlans?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-slate-800">Previous Plans</h2>
                </div>
                <div className="space-y-2.5">
                  {data.previousPlans.map((plan) => {
                    const meta = getStatusMeta(plan.status);
                    return (
                      <Card key={plan._id} className="rounded-xl border-slate-200">
                        <CardContent className="p-3.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-sm text-slate-800">
                              {plan.planName} Plan
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                              {plan.status?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            ₹{plan.price} · {plan.durationDays} days
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Plans */}
            {data?.upcomingPlans?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarClock className="w-4 h-4 text-blue-600" />
                  <h2 className="font-bold text-slate-800">Upcoming Plans</h2>
                </div>
                <div className="space-y-2.5">
                  {data.upcomingPlans.map((plan) => (
                    <Card key={plan._id} className="rounded-xl border-slate-200">
                      <CardContent className="p-3.5">
                        <span className="font-semibold text-sm text-slate-800">
                          {plan.planName} Plan
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          ₹{plan.price} · {plan.durationDays} days
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(plan.startDate)} → {formatDate(plan.endDate)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-4">
            {/* Filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { key: "all", label: "All" },
                { key: "success", label: "Completed" },
                { key: "pending", label: "Pending" },
                { key: "failed", label: "Failed" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    statusFilter === f.key
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f.label} ({filterCounts[f.key]})
                </button>
              ))}
            </div>

            {filteredPayments.length === 0 ? (
              <Card className="rounded-2xl border-slate-200">
                <CardContent className="p-12 text-center">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-800">No transactions found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {filteredPayments.map((txn) => {
                  const meta = getStatusMeta(txn.status);
                  const StatusIcon = meta.icon;
                  return (
                    <Card key={txn._id} className="rounded-xl border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                              <StatusIcon className={`w-5 h-5 ${meta.color}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-800 truncate">
                                {txn.subscription?.planName || txn.method}
                              </p>
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Hash className="w-3 h-3" />
                                {txn.transactionId?.replace("txn_", "")}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {formatDateTime(txn.status === "success" ? txn.paidAt : txn.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-slate-800">
                              {formatCurrency(Number(txn.amount) / 100)}
                            </p>
                            <Badge className={`${meta.bg} ${meta.color} mt-1`} variant="outline">
                              {meta.label || txn.status}
                            </Badge>
                          </div>
                        </div>
                        {txn.status === "failed" && txn.notes && (
                          <>
                            <Separator className="my-2.5" />
                            <p className="text-xs text-red-600">{txn.notes}</p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
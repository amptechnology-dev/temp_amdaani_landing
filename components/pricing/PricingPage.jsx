"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";

import {
  Crown,
  Check,
  X,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  PlusCircle,
  Package,
  Gift,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const planColors = {
  Free: "#2563EB",
  Basic: "#7C3AED",
  Standard: "#F59E0B",
  Premium: "#2563EB",
  Gold: "#D97706",
  Silver: "#64748B",
};

export default function PricingPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const router = useRouter();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [lastSubscription, setLastSubscription] = useState(null);
  const [upcomingSubscription, setUpcomingSubscription] = useState(null);
  const [activeTab, setActiveTab] = useState("regular");
  const [expandedPlan, setExpandedPlan] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const subRes = await api.get("/subscription/get-active-subscriptions");
      if (subRes.success && subRes.data?.subscription) {
        setCurrentSubscription(subRes.data.subscription);
        setUsage(subRes.data.usage);
      } else {
        setCurrentSubscription(null);
      }

      try {
        const lastRes = await api.get("/subscription/get-last-subscription");
        if (lastRes.success && lastRes.data) setLastSubscription(lastRes.data);
      } catch {
        setLastSubscription(null);
      }

      const plansRes = await api.get("/plan/active");
      if (plansRes.success && plansRes.data) {
        const transformed = plansRes.data.map((plan) => ({
          _id: plan._id,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          durationDays: plan.durationDays,
          featuresDetails: plan.features,
          usageLimits: plan.usageLimits,
          planType: plan.planType,
          color: planColors[plan.name] || "#2563EB",
          isCurrentPlan:
            subRes.data?.subscription?.plan &&
            plan._id === subRes.data.subscription.plan._id,
        }));
        setPlans(transformed);

        const userPlan = transformed.find((p) => p.isCurrentPlan);
        if (userPlan) setActiveTab(userPlan.planType || "regular");
      }

      try {
        const upRes = await api.get("/subscription/get-upcoming-subscriptions");
        if (upRes.success && upRes.data?.length > 0) {
          setUpcomingSubscription(upRes.data[0]);
        }
      } catch {
        setUpcomingSubscription(null);
      }
    } catch (error) {
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const handleFreePlan = async () => {
    try {
      const res = await api.post("/subscription/get-free");
      if (res.success) {
        toast.success(res.message || "Free plan activated!");
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to activate free plan");
    }
  };

  const handleGetPlan = (plan) => {
    router.push(`/dashboard/pricing/review?planId=${plan._id}`);
  };

  const hasActivePaidPlan =
    currentSubscription?.status === "active" &&
    currentSubscription?.planName?.toLowerCase() !== "free";

  const filteredPlans = plans
    .filter((plan) => {
      if (plan.planType !== activeTab) return false;
      if (plan.name === "Free") {
        if (hasActivePaidPlan) return false;
        if (lastSubscription?.planName?.toLowerCase() !== "free" && lastSubscription)
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isCurrentPlan && !b.isCurrentPlan) return -1;
      if (!a.isCurrentPlan && b.isCurrentPlan) return 1;
      return a.price - b.price;
    });

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);

  if (loading) {
    return (
      <div className={`min-h-screen w-full ${currentTheme.background}`}>
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full ${currentTheme.background}`}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${currentTheme.text}`}>
              Choose Your Plan
            </h1>
            <p className={`mt-1 text-sm ${currentTheme.textSecondary}`}>
              Manage your subscription and usage limits
            </p>
          </div>
          {hasActivePaidPlan && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/pricing/plan-details")}
            >
              <History className="w-4 h-4 mr-2" />
              Plan History
            </Button>
          )}
        </motion.div>

        {/* TABS: Subscription vs Top-up */}
        {hasActivePaidPlan && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2 bg-slate-100 p-1 h-12 rounded-xl">
              <TabsTrigger
                value="regular"
                className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Subscription
              </TabsTrigger>
              <TabsTrigger
                value="topup"
                className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Top-Up
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Upcoming subscription banner */}
        {upcomingSubscription && activeTab === "regular" && (
          <Card className="rounded-2xl border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800">
                    {upcomingSubscription.plan?.name || upcomingSubscription.planName}
                  </h3>
                  <Badge className="bg-blue-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Upcoming
                  </Badge>
                </div>
                <span className="font-bold text-blue-700">
                  {formatCurrency(upcomingSubscription.price)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Starts: {upcomingSubscription.startDate ? format(new Date(upcomingSubscription.startDate), "dd MMM yyyy") : "-"}
                </span>
                <span>
                  Ends: {upcomingSubscription.endDate ? format(new Date(upcomingSubscription.endDate), "dd MMM yyyy") : "-"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Free plan blocked for topup */}
        {activeTab === "topup" &&
        currentSubscription?.planName?.toLowerCase() === "free" ? (
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="p-8 text-center">
              <p className="font-bold text-slate-800 mb-2">
                Top-ups not available for Free plan
              </p>
              <p className="text-sm text-slate-400">
                Upgrade to a paid plan to purchase top-ups.
              </p>
            </CardContent>
          </Card>
        ) : filteredPlans.length === 0 ? (
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="p-8 text-center">
              <p className="font-bold text-slate-800 mb-2">
                No {activeTab === "regular" ? "subscription" : "top-up"} plans available
              </p>
              <p className="text-sm text-slate-400">Check back later for new offerings.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPlans.map((plan) => {
              if (plan.planType === "topup") {
                return (
                  <Card key={plan._id} className="rounded-2xl border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-800">{plan.name}</h3>
                        <p className="text-blue-600 font-semibold mt-1">
                          +{plan.usageLimits?.invoices} invoices
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Valid until plan expiry
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-extrabold text-slate-800">
                          {formatCurrency(plan.price)}
                        </span>
                        <Button size="sm" onClick={() => handleGetPlan(plan)}>
                          <PlusCircle className="w-4 h-4 mr-1.5" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              const isExpanded = expandedPlan === plan.name;
              const isCurrentPlan = plan.isCurrentPlan;
              const isPremium = plan.name === "Standard";
              let daysLeft = null;
              if (isCurrentPlan && currentSubscription?.endDate) {
                daysLeft = differenceInDays(
                  new Date(currentSubscription.endDate),
                  new Date(),
                );
              }
              const isExpiredLast =
                !currentSubscription &&
                lastSubscription?.planName === plan.name &&
                lastSubscription?.status === "expired";

              return (
                <Card
                  key={plan._id}
                  className={`rounded-2xl overflow-hidden cursor-pointer transition-all ${
                    isCurrentPlan
                      ? "border-2 border-blue-600 bg-blue-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  onClick={() => !isCurrentPlan && setExpandedPlan(isExpanded ? null : plan.name)}
                >
                  {isPremium && (
                    <div className="bg-blue-600 text-white text-center py-1.5 text-xs font-bold tracking-wide">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      MOST POPULAR
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                      {isCurrentPlan && (
                        <Badge className="bg-blue-600">
                          <Check className="w-3 h-3 mr-1" />
                          ACTIVE
                        </Badge>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-slate-500 mb-3">{plan.description}</p>
                    )}

                    {/* Price block */}
                    <div
                      className={`rounded-xl p-4 flex items-center justify-between mb-3 ${
                        isCurrentPlan ? "bg-white" : "bg-blue-50"
                      }`}
                    >
                      <div className="flex items-baseline gap-2">
                        <div>
                          <span className="text-3xl font-extrabold text-blue-600">
                            {formatCurrency(plan.price)}
                          </span>
                          <p className="text-[10px] text-slate-400">Excluding GST</p>
                        </div>
                        {plan.durationDays > 0 && (
                          <span className="text-sm text-slate-500">/{plan.durationDays} days</span>
                        )}
                      </div>
                      {isCurrentPlan && daysLeft !== null && (
                        <span className="text-sm font-semibold text-slate-600">
                          {daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "Expiring soon"}
                        </span>
                      )}
                    </div>

                    {/* Usage limits */}
                    {plan.usageLimits && (
                      <div className="rounded-xl bg-slate-100 p-3 flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            📊{" "}
                            {isCurrentPlan && currentSubscription?.usageLimits?.unlimited
                              ? "Unlimited invoices"
                              : isCurrentPlan && currentSubscription?.usageLimits?.invoices !== undefined
                              ? `${currentSubscription.usageLimits.invoices} invoices`
                              : plan.usageLimits.unlimited
                              ? "Unlimited invoices"
                              : `${plan.usageLimits.invoices} invoices`}
                          </p>
                          {isCurrentPlan && currentSubscription?.topUps?.length > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              🎁 Top-up: +
                              {currentSubscription.topUps.reduce(
                                (sum, t) => sum + t.usageLimits.invoices,
                                0,
                              )}{" "}
                              invoices
                            </p>
                          )}
                        </div>
                        {isCurrentPlan && plan.usageLimits.unlimited !== true && (
                          <Badge variant="outline" className="bg-white">
                            {(currentSubscription?.usageLimits?.invoices || plan.usageLimits.invoices) -
                              (usage?.invoicesUsed || 0)}{" "}
                            left
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Expanded features */}
                    {isExpanded && plan.featuresDetails?.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <h4 className="font-bold text-slate-800 mb-3">What's included</h4>
                        <div className="space-y-2.5 mb-4">
                          {plan.featuresDetails.map((feature, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  feature.available ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-500"
                                }`}
                              >
                                {feature.available ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              </div>
                              <div>
                                <p
                                  className={`text-sm ${
                                    feature.available ? "text-slate-700" : "text-red-500 opacity-60"
                                  }`}
                                >
                                  {feature.name}
                                </p>
                                {feature.note && (
                                  <p className="text-xs text-slate-400">{feature.note}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {(plan.name === "Free" || !isCurrentPlan) && (
                          <>
                            {plan.name === "Free" ? (
                              !isCurrentPlan && (
                                <Button className="w-full" onClick={(e) => { e.stopPropagation(); handleFreePlan(); }}>
                                  Activate Free Plan
                                </Button>
                              )
                            ) : (
                              !isCurrentPlan && (
                                <Button
                                  className="w-full"
                                  variant={isPremium ? "default" : "secondary"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGetPlan(plan);
                                  }}
                                >
                                  {isExpiredLast ? "Renew" : `Get ${plan.name}`}
                                </Button>
                              )
                            )}
                          </>
                        )}
                      </>
                    )}

                    {!isExpanded && !isCurrentPlan && (
                      <p className="text-center text-xs font-semibold text-blue-600 mt-2">
                        Tap to see details {isExpanded ? <ChevronUp className="inline w-3 h-3" /> : <ChevronDown className="inline w-3 h-3" />}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
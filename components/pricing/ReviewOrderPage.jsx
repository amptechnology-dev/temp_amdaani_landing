"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { toast } from "sonner";

import { Check, Loader2, ArrowLeft, Tag, ShieldCheck, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewOrderPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [gstin, setGstin] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await api.get("/plan/active");
        if (res.success) {
          const found = res.data.find((p) => p._id === planId);
          setPlan(found || null);
        }
      } catch {
        toast.error("Failed to load plan details");
      } finally {
        setLoading(false);
      }
    };
    if (planId) fetchPlan();
  }, [planId]);

  const applyCoupon = () => {
    if (couponCode.trim()) setCouponApplied(true);
  };

  const calculateDiscount = () => {
    if (couponApplied && plan) return plan.price * 0.1;
    return 0;
  };

  const calculateGST = () => {
    if (!plan) return 0;
    const discount = calculateDiscount();
    return (plan.price - discount) * 0.18;
  };

  const calculateTotal = () => {
    if (!plan) return 0;
    const discount = calculateDiscount();
    const subtotal = plan.price - discount;
    return subtotal + subtotal * 0.18;
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount || 0);

  const initiatePayment = async () => {
    try {
      setSubmitting(true);
      const res = await api.post("/subscription/initiate-payment", {
        planId: plan._id,
        amount: calculateTotal(),
        gstin: gstin || null,
        couponCode: couponApplied ? couponCode : null,
      });

      if (res.success) {
        const { paymentUrl, formData } = res.data;
        const params = new URLSearchParams({
          paymentUrl,
          formData: JSON.stringify(formData),
        });
        router.push(`/dashboard/pricing/payment-redirect?${params.toString()}`);
      }
    } catch (error) {
      toast.error("Failed to initiate payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`h-full w-full ${currentTheme.background} overflow-hidden`}>
        <div className="max-w-6xl mx-auto p-5 md:p-6 space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
            <div className="space-y-4">
              <Skeleton className="h-36 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={`h-full w-full ${currentTheme.background} overflow-hidden`}>
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <p className="font-bold text-slate-800 mb-2">Plan Not Found</p>
            <Button onClick={() => router.push("/dashboard/pricing")}>Back to Plans</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full ${currentTheme.background} overflow-hidden`}>
      <div className="max-w-6xl mx-auto p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className={`text-[19px] font-bold ${currentTheme.text}`}>Review Order</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
          {/* ── Left: details / form ── */}
          <div className="space-y-4 min-w-0">
            {/* Selected plan */}
            <Card
              className="rounded-2xl border-2"
              style={{ borderColor: "#2563EB", backgroundColor: "#EFF6FF" }}
            >
              <CardContent className="p-4">
                <p className="text-[11.5px] font-bold text-slate-500 mb-2.5 uppercase tracking-wide">
                  Selected Plan
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[17px] text-slate-800">{plan.name}</p>
                    <p className="text-[13px] text-slate-500">
                      {plan.durationDays > 0 ? `${plan.durationDays} days` : ""}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-slate-800">
                    {formatCurrency(plan.price)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Coupon + GSTIN side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="rounded-2xl border-slate-200">
                <CardContent className="p-4">
                  <p className="font-bold text-slate-800 mb-2.5 text-[13px]">Apply Coupon</p>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                    <Button
                      onClick={applyCoupon}
                      disabled={!couponCode.trim() || couponApplied}
                      className="shrink-0"
                      size="sm"
                    >
                      <Tag className="w-3.5 h-3.5 mr-1.5" />
                      Apply
                    </Button>
                  </div>
                  {couponApplied && (
                    <p className="text-[12px] text-blue-600 mt-2 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Coupon applied successfully!
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200">
                <CardContent className="p-4">
                  <p className="font-bold text-slate-800 mb-2.5 text-[13px]">GSTIN (Optional)</p>
                  <Input
                    placeholder="Enter your GSTIN"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="h-9 text-[13px]"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Features */}
            {plan.features?.length > 0 && (
              <Card className="rounded-2xl border-slate-200">
                <CardContent className="p-4">
                  <p className="font-bold text-slate-800 mb-3 text-[13.5px]">Features Included</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-4.5 h-4.5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-[13px] text-slate-700">{feature.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 text-[12px] text-slate-400 px-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Payments are processed securely through our encrypted payment gateway.
            </div>
          </div>

          {/* ── Right: order summary ── */}
          <div>
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3.5">
                  <ReceiptText className="w-4 h-4 text-blue-600" />
                  <p className="font-bold text-slate-800 text-[14px]">Price Details</p>
                </div>

                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plan Price</span>
                    <span className="text-slate-800">{formatCurrency(plan.price)}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coupon Discount</span>
                      <span className="text-blue-600">
                        -{formatCurrency(calculateDiscount())}
                      </span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex justify-between">
                    <span className="text-slate-500">GST (18%)</span>
                    <span className="text-slate-800">+{formatCurrency(calculateGST())}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between text-[14.5px] font-bold pt-1">
                    <span className="text-slate-800">Total Amount</span>
                    <span className="text-slate-800">{formatCurrency(calculateTotal())}</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 text-right -mt-1">Incl. GST</p>
                </div>

                <Button
                  className="w-full mt-4"
                  onClick={initiatePayment}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
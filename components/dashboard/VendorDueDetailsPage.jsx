"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";

// Icons
import {
  Loader2,
  ArrowLeft,
  User,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  IndianRupee,
  Wallet,
  RefreshCw,
  Banknote,
  CreditCard,
  Smartphone,
  Landmark,
  Info,
} from "lucide-react";

// shadcn components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const extractErrorMessage = (error) => {
  if (error.response?.data?.errors?.[0]?.message)
    return error.response.data.errors[0].message;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return "An unexpected error occurred";
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (dateString) =>
  dateString
    ? new Date(dateString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "bank_transfer", label: "Bank Transfer", icon: Landmark },
];

const getStatusMeta = (status) => {
  switch (status?.toLowerCase()) {
    case "paid":
      return { color: "text-blue-600", bg: "bg-blue-50", icon: CheckCircle };
    case "partial":
      return { color: "text-orange-600", bg: "bg-orange-50", icon: Clock };
    case "unpaid":
      return { color: "text-red-600", bg: "bg-red-50", icon: AlertCircle };
    default:
      return { color: "text-slate-500", bg: "bg-slate-50", icon: Info };
  }
};

// Payment form validation (mobile app er PurchaseDuesBottomSheet logic)
const paymentSchema = (dueAmount) =>
  Yup.object().shape({
    amount: Yup.number()
      .typeError("Amount must be a number")
      .positive("Amount must be positive")
      .required("Amount is required")
      .max(dueAmount, `Amount cannot exceed due amount (₹${dueAmount})`)
      .min(1, "Amount must be at least ₹1"),
    paymentMethod: Yup.string()
      .oneOf(["cash", "card", "upi", "bank_transfer"], "Invalid payment method")
      .required("Payment method is required"),
    note: Yup.string().max(100, "Note cannot exceed 100 characters"),
  });

export default function VendorDueDetailsPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const fetchDueDetails = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/vendor/due/${id}`);
      if (res.success || res.data?.success) {
        setVendor(res.data.vendor);
        setInvoices(res.data.purchases || []);
      }
    } catch (error) {
      toast.error(`Failed to load due details: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDueDetails();
  }, [fetchDueDetails]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDueDetails();
    toast.success("Due details refreshed!");
  };

  const openPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await api.post(
        `/purchase/add-payment/${selectedInvoice._id}`,
        {
          amount: parseFloat(values.amount),
          paymentMethod: values.paymentMethod,
          note: values.note || "",
        },
      );

      if (response.success || response.data?.success) {
        toast.success("Payment sent successfully!");
        resetForm();
        setIsPaymentDialogOpen(false);
        setSelectedInvoice(null);
        await fetchDueDetails();
      } else {
        throw new Error(response.data?.message || response.message || "Payment failed");
      }
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Failed to process payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalDue = () => invoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);

  if (loading) {
    return (
      <div className={`min-h-screen w-full ${currentTheme.background}`}>
        <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className={`min-h-screen w-full ${currentTheme.background}`}>
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-slate-200">
            <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">Vendor Not Found</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-4">
              Unable to load vendor due details. Please try again.
            </p>
            <Button onClick={fetchDueDetails}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalDue = getTotalDue();
  const unpaidCount = invoices.filter((inv) => inv.paymentStatus === "unpaid").length;
  const partialCount = invoices.filter((inv) => inv.paymentStatus === "partial").length;

  return (
    <div className={`min-h-screen w-full ${currentTheme.background}`}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ---------------- HEADER ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </motion.div>

        {/* ---------------- VENDOR SUMMARY CARD ---------------- */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h1 className={`text-xl font-bold capitalize truncate ${currentTheme.text}`}>
                    {vendor.name}
                  </h1>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                    <Phone className="w-3.5 h-3.5" />
                    {vendor.mobile || "—"}
                  </div>
                  {vendor.address && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{vendor.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[11px] text-slate-400 font-medium">Total Due</p>
                  <p className="text-lg font-extrabold text-red-600 mt-1">
                    {formatCurrency(totalDue)}
                  </p>
                </div>
                <div className="text-center border-x border-slate-100">
                  <p className="text-[11px] text-slate-400 font-medium">Unpaid</p>
                  <p className="text-lg font-bold text-red-600 mt-1">{unpaidCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-slate-400 font-medium">Partial</p>
                  <p className="text-lg font-bold text-orange-600 mt-1">{partialCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ---------------- INVOICES SECTION ---------------- */}
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-bold ${currentTheme.text}`}>Due Purchases</h2>
          <Badge variant="outline" className="bg-slate-50">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            {invoices.length} total
          </Badge>
        </div>

        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle className="w-14 h-14 text-blue-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">No Due Purchases</h3>
              <p className="text-sm text-slate-400">
                All invoices for this vendor are fully paid.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {invoices.map((invoice, index) => {
                const statusMeta = getStatusMeta(invoice.paymentStatus);
                const StatusIcon = statusMeta.icon;
                const progressPct =
                  invoice.grandTotal > 0
                    ? Math.min(100, (invoice.amountPaid / invoice.grandTotal) * 100)
                    : 0;

                return (
                  <motion.div
                    key={invoice._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <Card className="rounded-2xl border-slate-200 overflow-hidden">
                      <CardContent className="p-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatDate(invoice.date)}
                            </p>
                          </div>
                          <div
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${statusMeta.bg} ${statusMeta.color}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {invoice.paymentStatus?.toUpperCase()}
                          </div>
                        </div>

                        <Separator className="my-3" />

                        {/* Amounts */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Grand Total</span>
                            <span className="font-medium text-slate-800">
                              {formatCurrency(invoice.grandTotal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Amount Paid</span>
                            <span className="font-medium text-blue-600">
                              {formatCurrency(invoice.amountPaid)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-sm font-semibold text-slate-700">
                              Due Amount
                            </span>
                            <span className="text-base font-extrabold text-red-600">
                              {formatCurrency(invoice.amountDue)}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar for partial */}
                        {invoice.paymentStatus === "partial" && (
                          <div className="mt-3">
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {progressPct.toFixed(1)}% Paid
                            </p>
                          </div>
                        )}

                        {/* Send Payment button */}
                        <Button
                          className="w-full mt-4"
                          disabled={invoice.paymentStatus === "paid"}
                          onClick={() => openPaymentDialog(invoice)}
                        >
                          <IndianRupee className="w-4 h-4 mr-2" />
                          Send Payment
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ---------------- SEND PAYMENT DIALOG ---------------- */}
      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsPaymentDialogOpen(false);
            setSelectedInvoice(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Send Payment</DialogTitle>
            <DialogDescription>
              Record a payment against this purchase invoice.
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <>
              {/* Purchase summary */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Purchase Number</span>
                  <span className="font-medium text-slate-800">
                    {selectedInvoice.invoiceNumber || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Grand Total</span>
                  <span className="font-medium text-slate-800">
                    {formatCurrency(Math.round(selectedInvoice.grandTotal) || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Already Paid</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(selectedInvoice.amountPaid || 0)}
                  </span>
                </div>
                <Separator className="my-1.5" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-600">Due Amount</span>
                  <span className="text-base font-bold text-red-600">
                    {formatCurrency(selectedInvoice.amountDue)}
                  </span>
                </div>
              </div>

              <Formik
                initialValues={{
                  amount: selectedInvoice.amountDue > 0 ? String(Math.round(selectedInvoice.amountDue)) : "",
                  paymentMethod: "cash",
                  note: "",
                }}
                validationSchema={paymentSchema(selectedInvoice.amountDue)}
                onSubmit={handlePaymentSubmit}
                enableReinitialize
              >
                {({ isSubmitting, values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
                  <Form className="space-y-4">
                    {/* Amount input with "full amount" fill */}
                    <div>
                      <Label htmlFor="amount">Payment Amount</Label>
                      <div className="relative mt-1">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="amount"
                          name="amount"
                          value={values.amount}
                          onChange={(e) =>
                            setFieldValue("amount", e.target.value.replace(/[^0-9.]/g, ""))
                          }
                          onBlur={handleBlur}
                          placeholder="0"
                          disabled={selectedInvoice.amountDue <= 0}
                          className={`pl-9 pr-16 ${
                            errors.amount && touched.amount ? "border-red-500" : ""
                          }`}
                        />
                        {selectedInvoice.amountDue > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFieldValue("amount", String(selectedInvoice.amountDue))
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50"
                          >
                            Full
                          </button>
                        )}
                      </div>
                      <ErrorMessage
                        name="amount"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                      {selectedInvoice.amountDue <= 0 && (
                        <p className="text-xs text-slate-400 italic mt-1">
                          This purchase is already fully paid.
                        </p>
                      )}
                    </div>

                    {/* Payment method */}
                    <div>
                      <Label>Payment Method</Label>
                      <div className="grid grid-cols-4 gap-2 mt-1.5">
                        {PAYMENT_METHODS.map((m) => {
                          const MethodIcon = m.icon;
                          const isActive = values.paymentMethod === m.value;
                          return (
                            <button
                              key={m.value}
                              type="button"
                              onClick={() => setFieldValue("paymentMethod", m.value)}
                              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                                isActive
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <MethodIcon className="w-4 h-4" />
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                      <ErrorMessage
                        name="paymentMethod"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    {/* Note */}
                    <div>
                      <Label htmlFor="note">Payment Reference / Note</Label>
                      <Textarea
                        id="note"
                        name="note"
                        value={values.note}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Optional note (max 100 characters)"
                        className="mt-1"
                        rows={2}
                      />
                      <ErrorMessage
                        name="note"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsPaymentDialogOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !values.amount || selectedInvoice.amountDue <= 0}
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Send Payment
                      </Button>
                    </DialogFooter>
                  </Form>
                )}
              </Formik>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
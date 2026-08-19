// components/dashboard/AllTransactions.jsx
"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  CreditCard,
  Smartphone,
  Landmark,
  Banknote,
  Wallet,
  FileText,
  Printer,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { generateInvoiceHTML } from "../../utils/invoiceTemplate";
import { generatePurchaseHTML } from "../../utils/purchaseTemplate";

// =========================
// Config
// =========================
const DATE_FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

const getStartDate = (filter) => {
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  switch (filter) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return fmt(d);
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return fmt(d);
    }
    case "month": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return fmt(d);
    }
    case "all": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 10);
      return fmt(d);
    }
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return fmt(d);
    }
  }
};

const PAYMENT_ICONS = {
  card: CreditCard,
  upi: Smartphone,
  "bank transfer": Landmark,
  cash: Banknote,
};

const getPaymentIcon = (method) =>
  PAYMENT_ICONS[method?.toLowerCase()] || Wallet;

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return { bg: "#ECFDF5", text: "#059669", border: "#6EE7B7" };
    case "pending":
      return { bg: "#FFF7ED", text: "#F57C00", border: "#FDBA74" };
    case "failed":
      return { bg: "#FEF2F2", text: "#DC2626", border: "#FCA5A5" };
    default:
      return { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1" };
  }
};

const formatAmount = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const openInPrintWindow = (html) => {
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

// =========================
// GST type helper (same as SalesFlow / PurchaseFlow)
// =========================
function determineGstType(storeGst, partyGst, storeState, partyState) {
  const extractStateCode = (gst) => gst?.substring(0, 2);
  let isIgst = false;
  if (storeGst && partyGst) {
    const a = extractStateCode(storeGst);
    const b = extractStateCode(partyGst);
    if (a && b && a !== b) isIgst = true;
  } else if (storeState && partyState) {
    if (storeState.trim().toLowerCase() !== partyState.trim().toLowerCase())
      isIgst = true;
  }
  return isIgst;
}

// =========================
// Recompute invoice calculations from a fetched, already-saved invoice
// (mirrors the useMemo in SalesFlow.jsx so the preview matches exactly)
// =========================
function recomputeInvoiceCalculations(fullInvoice, isIgst) {
  const isGstInvoice = fullInvoice.type === "gst";
  let subtotal = 0;
  let totalTax = 0;
  const gstBreakdown = {};

  const computedItems = (fullInvoice.items || []).map((item) => {
    const gstRate = Number(item.gstRate || 0);
    const qty = Number(item.quantity ?? item.qty ?? 0);
    const sellingPriceRaw = Number(item.sellingPrice ?? item.price ?? 0);
    const discountType = item.discountType || "amount";
    const rawDiscountInput = Number(item.discount || 0);
    const itemDiscount =
      discountType === "percent"
        ? (sellingPriceRaw * rawDiscountInput) / 100
        : rawDiscountInput;
    const isTaxInclusive = Boolean(item.isTaxInclusive);
    const sellingPrice = Math.max(0, sellingPriceRaw - itemDiscount);

    let baseRate = 0,
      taxableValue = 0,
      gstAmount = 0,
      totalAmount = 0;

    if (isGstInvoice) {
      if (isTaxInclusive) {
        baseRate = sellingPriceRaw / (1 + gstRate / 100);
        taxableValue = (sellingPrice / (1 + gstRate / 100)) * qty;
        gstAmount = taxableValue * (gstRate / 100);
        totalAmount = sellingPrice * qty;
      } else {
        baseRate = sellingPriceRaw;
        taxableValue = sellingPrice * qty;
        gstAmount = taxableValue * (gstRate / 100);
        totalAmount = taxableValue + gstAmount;
      }
      subtotal += totalAmount;
      totalTax += gstAmount;

      const cgstAmount = isIgst ? 0 : gstAmount / 2;
      const sgstAmount = isIgst ? 0 : gstAmount / 2;
      const igstAmount = isIgst ? gstAmount : 0;

      if (!gstBreakdown[gstRate]) {
        gstBreakdown[gstRate] = {
          taxableAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalGst: 0,
        };
      }
      gstBreakdown[gstRate].taxableAmount += taxableValue;
      gstBreakdown[gstRate].cgstAmount += cgstAmount;
      gstBreakdown[gstRate].sgstAmount += sgstAmount;
      gstBreakdown[gstRate].igstAmount += igstAmount;
      gstBreakdown[gstRate].totalGst += gstAmount;
    } else {
      baseRate = sellingPriceRaw;
      taxableValue = sellingPrice * qty;
      totalAmount = taxableValue;
      subtotal += totalAmount;
    }

    return {
      ...item,
      baseRate,
      discount: rawDiscountInput,
      discountType,
      taxableValue,
      gstAmount,
      total: Number(totalAmount),
      qty,
      price: sellingPriceRaw,
      gstRate,
      isTaxInclusive,
    };
  });

  const discountTotal = Number(fullInvoice.discountTotal || 0);
  const grandTotalRaw = subtotal;
  const netTotal = Math.round(grandTotalRaw - discountTotal);
  const roundOff = Number(fullInvoice.roundOff || 0);
  const totalQuantity = computedItems.reduce((s, it) => s + (it.qty || 0), 0);

  return {
    subtotal,
    netTotal,
    roundOff,
    totalTax: isGstInvoice ? totalTax : 0,
    grandTotal: grandTotalRaw,
    grandTotalRaw,
    discountTotal,
    totalQuantity,
    itemCount: computedItems.length,
    gstBreakdown: isGstInvoice ? gstBreakdown : {},
    computedItems,
  };
}

// =========================
// Recompute purchase calculations from a fetched, already-saved purchase
// (mirrors the useMemo in PurchaseFlow.jsx)
// =========================
function recomputePurchaseCalculations(fullPurchase, isIgst) {
  const isGstInvoice = Boolean(fullPurchase.vendorGstNumber);
  let subtotal = 0;
  let totalTax = 0;
  const gstBreakdown = {};

  const computedItems = (fullPurchase.items || []).map((item) => {
    const qty = Number(item.quantity ?? item.qty ?? 0);
    const rawCostPrice = Number(item.costPrice ?? item.rate ?? 0);
    const discountType = item.purchaseDiscountType || "amount";
    const rawDiscountInput = Number(item.purchaseDiscount ?? 0);
    const purchaseDiscount =
      discountType === "percent"
        ? (rawCostPrice * rawDiscountInput) / 100
        : rawDiscountInput;
    const netRate = Math.max(0, rawCostPrice - purchaseDiscount);
    const gstRate = Number(item.gstRate ?? 0);
    const isPurchaseTaxInclusive = Boolean(item.isPurchaseTaxInclusive);

    let baseRate = 0,
      taxableValue = 0,
      gstAmount = 0,
      totalAmount = 0;

    if (isPurchaseTaxInclusive) {
      baseRate = gstRate > 0 ? netRate / (1 + gstRate / 100) : netRate;
      taxableValue = baseRate * qty;
      gstAmount = taxableValue * (gstRate / 100);
      totalAmount = netRate * qty;
    } else {
      baseRate = netRate;
      taxableValue = netRate * qty;
      gstAmount = taxableValue * (gstRate / 100);
      totalAmount = taxableValue + gstAmount;
    }

    subtotal += taxableValue;
    totalTax += gstAmount;

    if (isGstInvoice && gstRate > 0) {
      const cgstAmount = isIgst ? 0 : gstAmount / 2;
      const sgstAmount = isIgst ? 0 : gstAmount / 2;
      const igstAmount = isIgst ? gstAmount : 0;

      if (!gstBreakdown[gstRate]) {
        gstBreakdown[gstRate] = {
          taxableAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalGst: 0,
        };
      }
      gstBreakdown[gstRate].taxableAmount += taxableValue;
      gstBreakdown[gstRate].cgstAmount += cgstAmount;
      gstBreakdown[gstRate].sgstAmount += sgstAmount;
      gstBreakdown[gstRate].igstAmount += igstAmount;
      gstBreakdown[gstRate].totalGst += gstAmount;
    }

    return {
      ...item,
      costPrice: rawCostPrice,
      purchaseDiscount: rawDiscountInput,
      purchaseDiscountType: discountType,
      gstRate,
      isPurchaseTaxInclusive,
      baseRate,
      taxableValue,
      gstAmount,
      qty,
      total: Number(totalAmount.toFixed(4)),
    };
  });

  const grandTotalRaw = subtotal + totalTax;
  const invoiceDiscountTotal = Number(fullPurchase.discountTotal || 0);
  const netTotal = grandTotalRaw - invoiceDiscountTotal;
  const roundedTotal = Math.round(netTotal);
  const roundOff = Number(fullPurchase.roundOff || 0);
  const totalQuantity = computedItems.reduce((s, it) => s + (it.qty || 0), 0);

  return {
    subtotal,
    totalTax,
    netTotal,
    roundedTotal,
    roundOff,
    grandTotal: grandTotalRaw,
    grandTotalRaw,
    discountTotal: Number(invoiceDiscountTotal.toFixed(2)),
    totalQuantity,
    itemCount: computedItems.length,
    gstBreakdown: isGstInvoice ? gstBreakdown : {},
    computedItems,
  };
}

// =========================
// Fetch APIs
// =========================
const fetchCustomerPayments = async ({ queryKey }) => {
  const [_key, { filter }] = queryKey;
  const startDate = getStartDate(filter);
  const endDate = new Date().toISOString().slice(0, 10);
  const res = await api.get("/invoice/transactions", {
    params: { startDate, endDate },
  });
  return res.success ? res.data || [] : [];
};

const fetchVendorPayments = async ({ queryKey }) => {
  const [_key, { filter }] = queryKey;
  const startDate = getStartDate(filter);
  const endDate = new Date().toISOString().slice(0, 10);
  const res = await api.get("/purchase/transactions", {
    params: { startDate, endDate },
  });
  return res.success ? res.data || [] : [];
};

const fetchStoreData = async () => {
  const res = await api.get("/store");
  return res?.data || {};
};

export default function AllTransactionsPage() {
  const { theme } = useTheme();
  const currentTheme = themeConfig[theme];

  const [activeTab, setActiveTab] = useState("customers");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("month");

  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("month");

  // ---- preview dialog state ----
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const { data: storedata } = useQuery({
    queryKey: ["store"],
    queryFn: fetchStoreData,
    staleTime: 5 * 60 * 1000, // store info rarely changes
  });

  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ["customer-payments", { filter: customerFilter }],
    queryFn: fetchCustomerPayments,
    staleTime: 20000,
  });

  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ["vendor-payments", { filter: vendorFilter }],
    queryFn: fetchVendorPayments,
    staleTime: 20000,
  });

  const customerPayments = customerData ?? [];
  const vendorPayments = vendorData ?? [];

  const processedCustomerPayments = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customerPayments
      .filter((item) =>
        (item.invoice?.invoiceNumber || "").toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [customerPayments, customerSearch]);

  const processedVendorPayments = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    return vendorPayments
      .filter((item) => {
        const vendorName = (item.purchase?.vendorName || "").toLowerCase();
        const invoiceNumber = (item.purchase?.invoiceNumber || "").toLowerCase();
        return vendorName.includes(q) || invoiceNumber.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [vendorPayments, vendorSearch]);

  const customerTotal = useMemo(
    () =>
      processedCustomerPayments
        .filter((i) => i.status !== "cancelled")
        .reduce((sum, i) => sum + (i.amount || 0), 0),
    [processedCustomerPayments]
  );

  const vendorTotal = useMemo(
    () =>
      processedVendorPayments
        .filter((i) => i.status !== "cancelled")
        .reduce((sum, i) => sum + (i.amount || 0), 0),
    [processedVendorPayments]
  );

  const customerCount = processedCustomerPayments.filter(
    (i) => i.status !== "cancelled"
  ).length;
  const vendorCount = processedVendorPayments.filter(
    (i) => i.status !== "cancelled"
  ).length;

  const isVendorTab = activeTab === "vendors";
  const loading = isVendorTab ? vendorLoading : customerLoading;
  const search = isVendorTab ? vendorSearch : customerSearch;
  const setSearch = isVendorTab ? setVendorSearch : setCustomerSearch;
  const filter = isVendorTab ? vendorFilter : customerFilter;
  const setFilter = isVendorTab ? setVendorFilter : setCustomerFilter;
  const list = isVendorTab ? processedVendorPayments : processedCustomerPayments;
  const total = isVendorTab ? vendorTotal : customerTotal;
  const count = isVendorTab ? vendorCount : customerCount;

  // -------------------------------
  // Preview: fetch full record + rebuild printable HTML — no route change
  // -------------------------------
  const openInvoicePreview = async (invoiceId, invoiceNumber) => {
    setPreviewTitle(`Invoice #${invoiceNumber || ""}`);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml("");
    try {
      const res = await api.get(`/invoice/id/${invoiceId}`);
      const fullInvoice = res?.data;
      if (!fullInvoice) throw new Error("Invoice not found");

      const isIgst = determineGstType(
        storedata?.gstNumber,
        fullInvoice.customerGstNumber,
        storedata?.address?.state,
        fullInvoice.customerState
      );
      const invoiceCalculations = recomputeInvoiceCalculations(
        fullInvoice,
        isIgst
      );

      const formValues = {
        contactNumber: fullInvoice.customerMobile || "",
        customerName: fullInvoice.customerName || "",
        customerAddress: fullInvoice.customerAddress || "",
        customerState: fullInvoice.customerState || "",
        customerGstNumber: fullInvoice.customerGstNumber || "",
      };

      const html = generateInvoiceHTML({
        preview: false,
        createdInvoice: true,
        invoiceData: fullInvoice,
        formValues,
        cartItems: invoiceCalculations.computedItems,
        invoiceCalculations,
        invoiceNumber: fullInvoice.invoiceNumber,
        storedata: storedata || {},
        invoiceDate: new Date(
          fullInvoice.createdAt || fullInvoice.invoiceDate || Date.now()
        ),
        isGstInvoice: fullInvoice.type === "gst",
        payment: {
          paid: fullInvoice.amountPaid || 0,
          due: fullInvoice.amountDue || 0,
          status: fullInvoice.paymentStatus || "unpaid",
        },
      });

      setPreviewHtml(html);
    } catch (err) {
      setPreviewHtml(
        `<p style="padding:24px;font-family:sans-serif;color:#DC2626;">Failed to load invoice preview.</p>`
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const openPurchasePreview = async (purchaseId, invoiceNumber) => {
    setPreviewTitle(`Purchase #${invoiceNumber || ""}`);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml("");
    try {
      const res = await api.get(`/purchase/id/${purchaseId}`);
      const fullPurchase = res?.data;
      if (!fullPurchase) throw new Error("Purchase not found");

      const isIgst = determineGstType(
        storedata?.gstNumber,
        fullPurchase.vendorGstNumber,
        storedata?.address?.state,
        fullPurchase.vendorState
      );
      const invoiceCalculations = recomputePurchaseCalculations(
        fullPurchase,
        isIgst
      );

      const formValues = {
        vendorNumber: fullPurchase.vendorMobile || "",
        vendorName: fullPurchase.vendorName || "",
        address: fullPurchase.vendorAddress || "",
        state: fullPurchase.vendorState || "",
        postalCode: fullPurchase.vendorPostalCode || "",
        gstNumber: fullPurchase.vendorGstNumber || "",
      };

      const html = generatePurchaseHTML({
        preview: false,
        createdInvoice: true,
        invoiceData: fullPurchase,
        formValues,
        cartItems: invoiceCalculations.computedItems,
        invoiceCalculations,
        invoiceNumber: fullPurchase.invoiceNumber,
        storedata: storedata || {},
        invoiceDate: new Date(
          fullPurchase.createdAt || fullPurchase.date || Date.now()
        ),
        isGstInvoice: Boolean(fullPurchase.vendorGstNumber),
        payment: {
          paid: fullPurchase.amountPaid || 0,
          due: fullPurchase.amountDue || 0,
          status: fullPurchase.paymentStatus || "unpaid",
        },
      });

      setPreviewHtml(html);
    } catch (err) {
      setPreviewHtml(
        `<p style="padding:24px;font-family:sans-serif;color:#DC2626;">Failed to load purchase preview.</p>`
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCardClick = (item) => {
    if (isVendorTab && item.purchase?._id) {
      openPurchasePreview(item.purchase._id, item.purchase?.invoiceNumber);
    } else if (!isVendorTab && item.invoice?._id) {
      openInvoicePreview(item.invoice._id, item.invoice?.invoiceNumber);
    }
  };

  return (
    <div className={`min-h-screen p-6 ${currentTheme.background}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${currentTheme.text}`}>
            All Transactions
          </h1>
          <p className={currentTheme.textSecondary}>
            Payments received from customers & paid to vendors
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="customers" className="gap-1.5">
            <ArrowDownCircle className="w-4 h-4" />
            Customers
            {customerCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {customerCount > 99 ? "99+" : customerCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-1.5">
            <ArrowUpCircle className="w-4 h-4" />
            Vendors
            {vendorCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {vendorCount > 99 ? "99+" : vendorCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <Card className={`mb-4 ${currentTheme.card}`}>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={
                isVendorTab
                  ? "Search vendor / invoice..."
                  : "Search invoices..."
              }
              className="pl-10 rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <X
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer text-gray-400"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Date filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
        {DATE_FILTERS.map((f) => (
          <button
            key={f.key}
            disabled={loading}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-colors disabled:opacity-60 ${
              filter === f.key
                ? "bg-blue-50 text-blue-600 border-blue-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Overview card */}
      <Card className={`mb-4 ${currentTheme.card}`}>
        <CardContent className="p-5 flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: isVendorTab ? "#DC2626" : "#2563EB" }}
          >
            {isVendorTab ? (
              <ArrowUpCircle className="w-5 h-5 text-white" />
            ) : (
              <ArrowDownCircle className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800">
              {isVendorTab ? "Amount Paid" : "Amount Received"}
            </p>
            <p className="text-xs text-slate-400">
              {isVendorTab ? "Total paid to vendors" : "Total received from customers"}
            </p>
          </div>
          <div className="text-right shrink-0">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-300 ml-auto" />
            ) : (
              <>
                <p
                  className="text-xl font-bold"
                  style={{ color: isVendorTab ? "#DC2626" : "#2563EB" }}
                >
                  {formatAmount(total)}
                </p>
                <p className="text-xs text-slate-400">
                  {count} transaction{count !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions list */}
      <Card className={`${currentTheme.card} overflow-hidden`}>
        <CardHeader className={currentTheme.surfaceVariant}>
          <CardTitle>{isVendorTab ? "Vendor Payments" : "Customer Payments"}</CardTitle>
          <CardDescription>
            Showing {list.length} {isVendorTab ? "payment(s) made" : "payment(s) received"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading transactions...
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {isVendorTab ? (
                <ArrowUpCircle className="w-10 h-10 text-slate-300 mb-3" />
              ) : (
                <ArrowDownCircle className="w-10 h-10 text-slate-300 mb-3" />
              )}
              <p className="font-semibold text-slate-600">
                No {isVendorTab ? "payments" : "receipts"} found
              </p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                {search
                  ? "Try adjusting your search terms"
                  : `No ${isVendorTab ? "payments made" : "payments received"} in the selected period`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {list.map((item, index) => {
                  const status = getStatusColor(item.status);
                  const PayIcon = getPaymentIcon(item.paymentMethod);

                  const primaryLabel = isVendorTab
                    ? item.purchase?.vendorName || "N/A"
                    : item.invoice?.invoiceNumber || "N/A";
                  const secondaryLabel = isVendorTab
                    ? item.purchase?.invoiceNumber || "N/A"
                    : null;

                  return (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      onClick={() => handleCardClick(item)}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isVendorTab ? "#FEF2F2" : "#EFF6FF",
                          }}
                        >
                          <PayIcon
                            className="w-4 h-4"
                            style={{ color: isVendorTab ? "#DC2626" : "#2563EB" }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-semibold text-slate-800 text-sm truncate">
                              {primaryLabel}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              {isVendorTab ? (
                                <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />
                              ) : (
                                <ArrowDownCircle className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              <span
                                className="font-bold text-sm"
                                style={{ color: isVendorTab ? "#DC2626" : "#2563EB" }}
                              >
                                {formatAmount(item.amount)}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {secondaryLabel && (
                                <span className="text-xs text-blue-500 truncate">
                                  {secondaryLabel}
                                </span>
                              )}
                              <span className="text-xs text-slate-400 capitalize truncate">
                                {item.paymentMethod}
                              </span>
                              <span className="text-xs text-slate-300 shrink-0">
                                {formatDistanceToNow(new Date(item.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>

                            {item.status !== "completed" && (
                              <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ml-2"
                                style={{
                                  backgroundColor: status.bg,
                                  color: status.text,
                                  borderColor: status.border,
                                }}
                              >
                                {String(item.status || "").toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog — no route change, print straight from here */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl w-full h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b shrink-0 flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {previewTitle || "Preview"}
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              disabled={previewLoading || !previewHtml}
              onClick={() => openInPrintWindow(previewHtml)}
              className="mr-8"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              Loading preview...
            </div>
          ) : (
            <iframe
              title="transaction-preview"
              srcDoc={previewHtml}
              className="flex-1 w-full border-0 bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
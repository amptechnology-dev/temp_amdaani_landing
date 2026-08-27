// components/dashboard/AllTransactions.jsx
"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { themeConfig } from "../../utils/ThemeConfig";
import api from "../../utils/api";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
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
  Eye,
  RefreshCw,
  Receipt,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const TAB_FILTERS = [
  { key: "customers", label: "Customers" },
  { key: "vendors", label: "Vendors" },
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

  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // ---- preview dialog state ----
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const { data: storedata } = useQuery({
    queryKey: ["store"],
    queryFn: fetchStoreData,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: customerData,
    isLoading: customerLoading,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["customer-payments", { filter: customerFilter }],
    queryFn: fetchCustomerPayments,
    staleTime: 20000,
  });

  const {
    data: vendorData,
    isLoading: vendorLoading,
    refetch: refetchVendors,
  } = useQuery({
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

  // reset to page 1 whenever the underlying list changes shape
  const totalPages = Math.max(1, Math.ceil(list.length / limit));
  const pagedList = list.slice((page - 1) * limit, page * limit);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const handleFilterChange = (key) => {
    setFilter(key);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch("");
    setPage(1);
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchCustomers(), refetchVendors()]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

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

  const handleRowClick = (item) => {
    if (isVendorTab && item.purchase?._id) {
      openPurchasePreview(item.purchase._id, item.purchase?.invoiceNumber);
    } else if (!isVendorTab && item.invoice?._id) {
      openInvoicePreview(item.invoice._id, item.invoice?.invoiceNumber);
    }
  };

  // Combined chip list: tab chips + date chips (Expenses-page pattern)
  const chips = [...TAB_FILTERS, ...DATE_FILTERS];

  const isChipActive = (chip) => {
    const isTabChip = TAB_FILTERS.some((f) => f.key === chip.key);
    if (isTabChip) return activeTab === chip.key;
    return filter === chip.key;
  };

  const handleChipClick = (chip) => {
    const isTabChip = TAB_FILTERS.some((f) => f.key === chip.key);
    if (isTabChip) {
      handleTabChange(chip.key);
    } else {
      handleFilterChange(chip.key);
    }
  };

  return (
    <div className={`min-h-screen p-3 md:p-4 ${currentTheme.background}`}>
      {/* Header — compact */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className={`text-xl md:text-2xl font-bold ${currentTheme.text}`}>
            All Transactions
          </h1>
          <p className={`text-sm ${currentTheme.textSecondary}`}>
            Payments received from customers & paid to vendors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary strip — compact single row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <ArrowDownCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-tight">
              Received ({customerCount})
            </p>
            <p className="text-base font-bold text-blue-600 leading-tight">
              {customerLoading ? "…" : formatAmount(customerTotal)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <ArrowUpCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-tight">
              Paid ({vendorCount})
            </p>
            <p className="text-base font-bold text-red-600 leading-tight">
              {vendorLoading ? "…" : formatAmount(vendorTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Search + limit — compact single row */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={
              isVendorTab ? "Search vendor / invoice…" : "Search invoices…"
            }
            className="pl-9 h-9 text-sm rounded-lg"
            value={search}
            onChange={handleSearchChange}
          />
          {search && (
            <X
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer text-gray-400"
            />
          )}
        </div>

        <Select
          value={limit}
          onValueChange={(v) => {
            setLimit(Number(v));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[110px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((x) => (
              <SelectItem key={x} value={x} className="text-sm">
                {x} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips — tab + date combined */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar">
        {chips.map((chip) => {
          const active = isChipActive(chip);
          const isTabChip = TAB_FILTERS.some((f) => f.key === chip.key);
          return (
            <button
              key={chip.key}
              disabled={loading && !isTabChip}
              onClick={() => handleChipClick(chip)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors disabled:opacity-60 ${
                active
                  ? isTabChip
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ===== Excel-style dense table ===== */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="text-base font-semibold text-slate-700">
            {isVendorTab ? "Vendor Payments" : "Customer Payments"}
          </span>
          <span className="text-sm text-slate-400">
            Showing {pagedList.length} of {list.length}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading transactions...
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Receipt className="w-11 h-11 text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">
              No {isVendorTab ? "payments" : "receipts"} found
            </p>
            <p className="text-sm text-slate-400 max-w-xs mt-0.5">
              {search
                ? `No results match "${search}".`
                : `No ${isVendorTab ? "payments made" : "payments received"} in the selected period.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-2 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-2">
                    {isVendorTab ? "Vendor" : "Invoice #"}
                  </th>
                  {isVendorTab && (
                    <th className="text-left font-semibold px-3 py-2">Invoice Ref</th>
                  )}
                  <th className="text-left font-semibold px-3 py-2">Method</th>
                  <th className="text-left font-semibold px-3 py-2">Status</th>
                  <th className="text-left font-semibold px-3 py-2">When</th>
                  <th className="text-right font-semibold px-3 py-2">Amount</th>
                  <th className="text-center font-semibold px-3 py-2 w-16">View</th>
                </tr>
              </thead>
              <tbody>
                {pagedList.map((item, index) => {
                  const status = getStatusColor(item.status);
                  const PayIcon = getPaymentIcon(item.paymentMethod);
                  const primaryLabel = isVendorTab
                    ? item.purchase?.vendorName || "N/A"
                    : item.invoice?.invoiceNumber || "N/A";
                  const secondaryLabel = isVendorTab
                    ? item.purchase?.invoiceNumber || "—"
                    : null;

                  return (
                    <motion.tr
                      key={item._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleRowClick(item)}
                      className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 transition-colors ${
                        index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-2 text-slate-400 text-sm align-middle">
                        {(page - 1) * limit + index + 1}
                      </td>

                      <td className="px-3 py-2 align-middle">
                        <span className="font-medium text-slate-800 truncate text-sm">
                          {primaryLabel}
                        </span>
                      </td>

                      {isVendorTab && (
                        <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                          {secondaryLabel}
                        </td>
                      )}

                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="text-[11px] flex items-center gap-1 w-fit capitalize"
                        >
                          <PayIcon className="w-3.5 h-3.5" />
                          {item.paymentMethod || "—"}
                        </Badge>
                      </td>

                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase"
                          style={{
                            backgroundColor: status.bg,
                            color: status.text,
                            borderColor: status.border,
                          }}
                        >
                          {item.status || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-slate-400 text-sm align-middle whitespace-nowrap">
                        {item.createdAt
                          ? formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                            })
                          : "—"}
                      </td>

                      <td className="px-3 py-2 text-right align-middle whitespace-nowrap">
                        <span
                          className="font-semibold text-sm"
                          style={{ color: isVendorTab ? "#DC2626" : "#2563EB" }}
                        >
                          {formatAmount(item.amount)}
                        </span>
                      </td>

                      <td
                        className="px-3 py-2 align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleRowClick(item)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination — compact */}
      {!loading && list.length > 0 && (
        <div className="flex justify-between items-center mt-3">
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

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
"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Search,
  X,
  Calendar,
  CalendarX2,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";
import api from "../../utils/api";

// ── helpers ──────────────────────────────────────────────────────────────
const currency = (v) => `₹${Number(v || 0).toFixed(2)}`;
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : String(v));
const num = (v) => Number(v || 0);

const formatDDMMYY = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const formatShort = (date) => {
  if (!date) return "All";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
};

const toInputDate = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

// Normalizes a purchase row for display / export
const getRowData = (p, sl) => {
  const totalQty =
    p.totalItemsQty != null
      ? Number(p.totalItemsQty)
      : (p.items || []).reduce((s, it) => s + Number(it.quantity || 0), 0);

  const gstTotal = num(p.gstTotal);
  const cgst = p.isIgst ? 0 : gstTotal / 2;
  const sgst = p.isIgst ? 0 : gstTotal / 2;
  const taxableValue = num(p.taxableValue ?? p.subTotal);

  return {
    sl,
    id: p._id,
    billDate: p.date ? new Date(p.date).toLocaleDateString("en-IN") : "-",
    invoiceNumber: p.invoiceNumber || "-",
    supplierName: p.vendorName || "-",
    supplierMobile: p.vendorMobile || "-",
    totalItemsQty: totalQty,
    discountPct: num(p.discountTotal),
    taxableValue,
    cgst,
    sgst,
    gstTotal,
    paymentStatus: p.paymentStatus || "-",
    grandTotal: num(p.grandTotal),
  };
};

const PAYMENT_METHOD_OPTIONS = [
  { label: "All", value: null },
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "UPI", value: "upi" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Cheque", value: "cheque" },
];
const PAYMENT_STATUS_OPTIONS = [
  { label: "All", value: null },
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Partial", value: "partial" },
];
const PURCHASE_STATUS_OPTIONS = [
  { label: "All", value: null },
  { label: "Active", value: "active" },
  { label: "Cancelled", value: "cancelled" },
];

export default function PurchaseReportPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeRange, setActiveRange] = useState(null); // 'today' | 'yesterday' | 'thisWeek' | null

  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(null);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const searchBoxRef = useRef(null);
  const dropdownBoxRef = useRef(null);

  const [storedata, setStoredata] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/store");
        setStoredata(res?.data || {});
      } catch {
        /* silent */
      }
    })();
  }, []);

  const storeName = storedata?.name || storedata?.storeName || "Store";
  const address = (() => {
    if (!storedata?.address) return "";
    if (typeof storedata.address === "object") {
      const a = storedata.address;
      return [a.street, a.city, a.state, a.postalCode].filter(Boolean).join(", ");
    }
    return String(storedata.address);
  })();
  const gstin = storedata?.gstNumber || storedata?.gstin || "";

  // close popovers on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (dropdownBoxRef.current && !dropdownBoxRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formattedRange = useMemo(
    () => `${formatShort(startDate)} – ${formatShort(endDate)}`,
    [startDate, endDate]
  );

  // ── suggestions ──────────────────────────────────────────────────────
  const fetchDefaultSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const res = await api.get("/purchase/report/suggestions");
      const list = res?.data?.data ?? res?.data ?? [];
      setSuggestions(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Default suggestion fetch error:", e?.message);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSearchFocus = () => {
    setShowSuggestions(true);
    if (!searchText.trim()) fetchDefaultSuggestions();
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      fetchDefaultSuggestions();
      return;
    }
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const res = await api.get(`/purchase/report/suggestions?q=${encodeURIComponent(text.trim())}`);
        const list = res?.data?.data ?? res?.data ?? [];
        setSuggestions(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error("Suggestion fetch error:", e?.message);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 400);
  };

  const selectSuggestion = (value) => {
    setSearchText(value);
    setShowSuggestions(false);
    setSuggestions([]);
    setInvoiceSearch(value);
  };

  const submitSearch = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    setInvoiceSearch(searchText.trim());
  };

  const clearSearch = () => {
    setSearchText("");
    setInvoiceSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // ── fetch ────────────────────────────────────────────────────────────
  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true);
      let query = "";
      if (activeRange) {
        query = `?range=${activeRange}`;
      } else {
        const params = [];
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          params.push(`startDate=${s.getTime()}`);
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          params.push(`endDate=${e.getTime()}`);
        }
        query = params.length ? `?${params.join("&")}` : "";
      }

      const extraParams = [];
      if (paymentMethod) extraParams.push(`paymentMethod=${paymentMethod}`);
      if (paymentStatusFilter) extraParams.push(`paymentStatus=${paymentStatusFilter}`);
      if (purchaseStatus) extraParams.push(`status=${purchaseStatus}`);
      if (invoiceSearch) extraParams.push(`invoiceSearch=${encodeURIComponent(invoiceSearch)}`);
      if (extraParams.length) {
        query += query ? `&${extraParams.join("&")}` : `?${extraParams.join("&")}`;
      }

      const res = await api.get(`/purchase/report${query}`);
      let rows = res?.data?.data ?? res?.data ?? [];
      if (!Array.isArray(rows)) rows = [];

      if (!activeRange && startDate && endDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        rows = rows.filter((p) => {
          const d = new Date(p.date || p.createdAt);
          return d >= sDate && d <= eDate;
        });
      }

      rows = [...rows].sort(
        (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
      );

      setPurchases(rows);
      setHasFetched(true);
      if (!rows.length) {
        toast.error("No records found for the selected filters.");
      }
    } catch (e) {
      console.error("Purchase report fetch error:", e?.message);
      toast.error("Failed to fetch purchase report.");
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, [activeRange, startDate, endDate, paymentMethod, paymentStatusFilter, purchaseStatus, invoiceSearch]);

  // auto-fetch when a date range or any dropdown filter changes
  useEffect(() => {
    const hasDateRange = startDate && endDate;
    const hasDropdownFilter = paymentMethod || paymentStatusFilter || purchaseStatus || invoiceSearch;
    if (hasDateRange || hasDropdownFilter) fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, activeRange, paymentMethod, paymentStatusFilter, purchaseStatus, invoiceSearch]);

  // ── quick-range helpers ──────────────────────────────────────────────
  const applyToday = () => {
    const today = new Date();
    setActiveRange("today");
    setStartDate(today);
    setEndDate(today);
  };
  const applyYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    setActiveRange("yesterday");
    setStartDate(y);
    setEndDate(y);
  };
  const applyThisWeek = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    setActiveRange("thisWeek");
    setStartDate(weekStart);
    setEndDate(today);
  };
  const applyThisYear = () => {
    setActiveRange(null);
    const today = new Date();
    const fy =
      today.getMonth() + 1 >= 4
        ? new Date(today.getFullYear(), 3, 1)
        : new Date(today.getFullYear() - 1, 3, 1);
    setStartDate(fy);
    setEndDate(today);
  };
  const applyThisMonth = () => {
    setActiveRange(null);
    const today = new Date();
    setStartDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setEndDate(today);
  };
  const applyPreviousMonth = () => {
    setActiveRange(null);
    const today = new Date();
    setStartDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    setEndDate(new Date(today.getFullYear(), today.getMonth(), 0));
  };

  const clearAll = () => {
    setActiveRange(null);
    setStartDate(null);
    setEndDate(null);
    setPaymentMethod(null);
    setPaymentStatusFilter(null);
    setPurchaseStatus(null);
    setActiveDropdown(null);
    clearSearch();
    setPurchases([]);
    setHasFetched(false);
  };

  // ── totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    return {
      count: purchases.length,
      subTotal: purchases.reduce((s, r) => s + num(r.taxableValue ?? r.subTotal), 0),
      gstTotal: purchases.reduce((s, r) => s + num(r.gstTotal), 0),
      discountTotal: purchases.reduce((s, r) => s + num(r.discountTotal), 0),
      grandTotal: purchases.reduce((s, r) => s + num(r.grandTotal), 0),
      totalQty: purchases.reduce(
        (s, r) =>
          s +
          (r.totalItemsQty != null
            ? Number(r.totalItemsQty)
            : (r.items || []).reduce((qs, it) => qs + Number(it.quantity || 0), 0)),
        0
      ),
    };
  }, [purchases]);

  const hasData = purchases.length > 0;

  const paymentMethodLabel =
    PAYMENT_METHOD_OPTIONS.find((o) => o.value === paymentMethod)?.label || "Payment Mode";
  const paymentStatusLabel =
    PAYMENT_STATUS_OPTIONS.find((o) => o.value === paymentStatusFilter)?.label || "Payment Status";
  const purchaseStatusLabel =
    PURCHASE_STATUS_OPTIONS.find((o) => o.value === purchaseStatus)?.label || "Purchase Status";

  const dropdownFilters = [
    { key: "paymentMethod", label: paymentMethodLabel, value: paymentMethod, onSelect: setPaymentMethod, options: PAYMENT_METHOD_OPTIONS },
    { key: "paymentStatus", label: paymentStatusLabel, value: paymentStatusFilter, onSelect: setPaymentStatusFilter, options: PAYMENT_STATUS_OPTIONS },
    { key: "purchaseStatus", label: purchaseStatusLabel, value: purchaseStatus, onSelect: setPurchaseStatus, options: PURCHASE_STATUS_OPTIONS },
  ];

  // ── PDF export ───────────────────────────────────────────────────────
  const buildHTML = () => {
    const sorted = [...purchases].sort(
      (a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)
    );

    const rowsHTML = sorted
      .map((p, idx) => {
        const d = getRowData(p, idx + 1);
        const statusColor =
          d.paymentStatus === "paid" ? "#16a34a" : d.paymentStatus === "partial" ? "#d97706" : "#dc2626";
        return `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${d.sl}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${safe(d.invoiceNumber)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${d.billDate}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(d.supplierName)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(d.supplierMobile)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${d.totalItemsQty}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${d.discountPct}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(d.taxableValue)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(d.cgst)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(d.sgst)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(d.gstTotal)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;font-weight:700;">${currency(d.grandTotal)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;color:${statusColor};font-weight:600;text-transform:capitalize;">${d.paymentStatus}</td>
      </tr>`;
      })
      .join("");

    return `
      <html><head><meta charset="utf-8"/>
      <style>
        @page { size: A4 landscape; margin: 20px; }
        body { font-family:Roboto,Arial; margin:0; padding:16px; color:#111; font-size:11px; }
        h1   { font-size:18px; margin-bottom:2px; }
        .sub { color:#666; margin-bottom:14px; }
        .chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; }
        .chip  { background:#f0f0f0; border:1px solid #ddd; border-radius:12px; padding:4px 10px; font-size:10px; }
        .footer{ margin-top:14px; color:#888; font-size:9px; display:flex; justify-content:space-between; }
      </style></head><body>
        <h2 style="text-align:center;">${storeName}</h2>
        ${address ? `<p style="text-align:center;">${address}</p>` : ""}
        ${gstin ? `<p style="text-align:center;">GSTIN: ${gstin}</p>` : ""}
        <h1>Purchase Register</h1>
        <div class="sub">Period: ${formattedRange}</div>
        <div class="chips">
          <div class="chip">Purchases: ${totals.count}</div>
          <div class="chip">Total Qty: ${totals.totalQty}</div>
          <div class="chip">Taxable: ${currency(totals.subTotal)}</div>
          <div class="chip">GST: ${currency(totals.gstTotal)}</div>
          <div class="chip" style="background:#e8f0fe;border-color:#3b5bdb;">
            <b>Grand Total: ${currency(totals.grandTotal)}</b>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f0f4ff;">
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">SL</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Bill No</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Bill Date</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Supplier</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Mobile</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Qty</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Discount</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Taxable</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">CGST</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">SGST</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">GST</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Net Amount</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML || `<tr><td colspan="13" style="padding:12px;text-align:center;">No records</td></tr>`}
            <tr>
              <td colspan="5" style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">TOTAL</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${totals.totalQty}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;"></td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.subTotal)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.gstTotal / 2)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.gstTotal / 2)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.gstTotal)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.grandTotal)}</td>
              <td style="padding:6px;border-top:2px solid #333;"></td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <span>AMDAANI — Smart Business Management</span>
          <span>Generated ${new Date().toLocaleString("en-IN")}</span>
        </div>
      </body></html>`;
  };

  const exportPDF = () => {
    if (!hasData) {
      toast.error("Generate a report first.");
      return;
    }
    const html = buildHTML();
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked — please allow popups to export PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // ── Excel export ─────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!hasData) {
      toast.error("Generate a report first.");
      return;
    }
    try {
      const sorted = [...purchases].sort(
        (a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)
      );
      const sheet = sorted.map((p, idx) => {
        const d = getRowData(p, idx + 1);
        return {
          SL: d.sl,
          "Bill No": d.invoiceNumber,
          "Bill Date": d.billDate,
          "Supplier Name": d.supplierName,
          "Supplier Mobile": d.supplierMobile,
          "Total Items Qty": d.totalItemsQty,
          "Discount Amount": d.discountPct,
          "Taxable Value": d.taxableValue,
          CGST: d.cgst,
          SGST: d.sgst,
          "Total GST": d.gstTotal,
          "Payment Status": d.paymentStatus,
          "Net Amount": d.grandTotal,
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sheet);
      ws["!cols"] = Object.keys(sheet[0] || {}).map((k) => ({ wch: Math.max(14, k.length + 2) }));
      XLSX.utils.book_append_sheet(wb, ws, "Purchase Report");

      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Purchase_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Excel file downloaded.");
    } catch (e) {
      console.error("Excel export error:", e?.message);
      toast.error("Could not generate Excel file.");
    }
  };

  const emptyMessage =
    !startDate && !endDate && !paymentMethod && !paymentStatusFilter && !purchaseStatus && !invoiceSearch
      ? "Select a date range or filter and tap Generate."
      : hasFetched
      ? "No records found for the selected filters."
      : "Tap Generate to load the report.";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* ---------------- HEADER ---------------- */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.history.back()}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Purchase Report</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            disabled={!hasData || loading}
            className="h-9 px-3 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={exportExcel}
            disabled={!hasData || loading}
            className="h-9 px-3 rounded-lg border border-slate-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* ---------------- FILTERS ---------------- */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 mb-5 space-y-3.5">
        {/* Search */}
        <div className="relative" ref={searchBoxRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <form onSubmit={submitSearch}>
            <input
              type="text"
              placeholder="Search invoice no, vendor name or mobile"
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleSearchFocus}
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </form>
          {searchText ? (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          ) : suggestionsLoading ? (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
          ) : null}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.type}-${item.value}-${idx}`}
                  onClick={() => selectSuggestion(item.value)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 ${
                    idx < suggestions.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={toInputDate(startDate)}
              max={toInputDate(new Date())}
              onChange={(e) => {
                setActiveRange(null);
                setStartDate(e.target.value ? new Date(e.target.value) : null);
              }}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={toInputDate(endDate)}
              max={toInputDate(new Date())}
              onChange={(e) => {
                setActiveRange(null);
                setEndDate(e.target.value ? new Date(e.target.value) : null);
              }}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <button
            onClick={clearAll}
            disabled={loading}
            title="Clear filters"
            className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CalendarX2 className="w-4 h-4" />
          </button>
        </div>

        {/* Today / Yesterday / This Week toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          {[
            { value: "today", label: "Today", fn: applyToday },
            { value: "yesterday", label: "Yesterday", fn: applyYesterday },
            { value: "thisWeek", label: "This Week", fn: applyThisWeek },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={opt.fn}
              disabled={loading}
              className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors ${
                activeRange === opt.value ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* This Year / This Month / Prev Month */}
        <div className="flex gap-2">
          {[
            { label: "This Year", fn: applyThisYear },
            { label: "This Month", fn: applyThisMonth },
            { label: "Prev Month", fn: applyPreviousMonth },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              disabled={loading}
              className="flex-1 h-9 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Dropdown filters */}
        <div className="flex gap-2 relative" ref={dropdownBoxRef}>
          {dropdownFilters.map((filter) => (
            <div key={filter.key} className="relative flex-1">
              <button
                onClick={() => setActiveDropdown(activeDropdown === filter.key ? null : filter.key)}
                className={`w-full h-9 px-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
                  filter.value != null
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{filter.label}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-1" />
              </button>
              {activeDropdown === filter.key && (
                <div className="absolute z-20 mt-1 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-[160px]">
                  {filter.options.map((opt) => (
                    <button
                      key={String(opt.value)}
                      onClick={() => {
                        filter.onSelect(opt.value);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs ${
                        filter.value === opt.value
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={fetchPurchases}
          disabled={
            loading ||
            (!startDate && !endDate && !paymentMethod && !paymentStatusFilter && !purchaseStatus && !invoiceSearch)
          }
          className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>

      {/* ---------------- CONTENT ---------------- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mb-2" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : !hasData ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm text-center">
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 mb-5">
            <div className="text-xs text-slate-400 mb-3">{formattedRange}</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryStat label="Purchases" value={String(totals.count)} />
              <SummaryStat label="Total Qty" value={String(totals.totalQty)} />
              <SummaryStat label="Taxable" value={currency(totals.subTotal)} />
              <SummaryStat label="GST" value={currency(totals.gstTotal)} accent="text-red-600" />
              <SummaryStat label="Grand Total" value={currency(totals.grandTotal)} accent="text-blue-600" bold />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden mb-5">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Purchase Register</h2>
              <span className="text-xs text-slate-400">{totals.count} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-center font-semibold px-4 py-3">Bill No</th>
                    <th className="text-left font-semibold px-4 py-3">Date</th>
                    <th className="text-left font-semibold px-4 py-3">Supplier</th>
                    <th className="text-left font-semibold px-4 py-3">Mobile</th>
                    <th className="text-center font-semibold px-4 py-3">Qty</th>
                    <th className="text-right font-semibold px-4 py-3">Taxable</th>
                    <th className="text-right font-semibold px-4 py-3">CGST</th>
                    <th className="text-right font-semibold px-4 py-3">SGST</th>
                    <th className="text-right font-semibold px-4 py-3">GST</th>
                    <th className="text-right font-semibold px-4 py-3">Net Amount</th>
                    <th className="text-center font-semibold px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map((p, i) => {
                    const d = getRowData(p, i + 1);
                    const statusColor =
                      d.paymentStatus === "paid"
                        ? "text-emerald-600"
                        : d.paymentStatus === "partial"
                        ? "text-amber-600"
                        : "text-red-600";
                    return (
                      <tr key={`${d.id || "row"}-${i}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-center font-medium text-slate-800">{safe(d.invoiceNumber)}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{d.billDate}</td>
                        <td className="px-4 py-3 text-slate-700">{safe(d.supplierName)}</td>
                        <td className="px-4 py-3 text-slate-500">{safe(d.supplierMobile)}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{d.totalItemsQty}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{currency(d.taxableValue)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{currency(d.cgst)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{currency(d.sgst)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{currency(d.gstTotal)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{currency(d.grandTotal)}</td>
                        <td className={`px-4 py-3 text-center font-medium capitalize ${statusColor}`}>
                          {d.paymentStatus}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-semibold text-slate-800">
                    <td colSpan={4} className="px-4 py-3 text-right">TOTAL</td>
                    <td className="px-4 py-3 text-center">{totals.totalQty}</td>
                    <td className="px-4 py-3 text-right">{currency(totals.subTotal)}</td>
                    <td className="px-4 py-3 text-right">{currency(totals.gstTotal / 2)}</td>
                    <td className="px-4 py-3 text-right">{currency(totals.gstTotal / 2)}</td>
                    <td className="px-4 py-3 text-right">{currency(totals.gstTotal)}</td>
                    <td className="px-4 py-3 text-right">{currency(totals.grandTotal)}</td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------------------
// Summary stat
// -----------------------------------------
function SummaryStat({ label, value, accent, bold }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className={`${bold ? "text-lg" : "text-base"} font-bold ${accent || "text-slate-800"} truncate`}>
        {value}
      </div>
    </div>
  );
}
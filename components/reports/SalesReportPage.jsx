"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  ChevronDown,
  Check,
  Phone,
  Receipt,
  ChevronLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import api from "../../utils/api";

// -----------------------------------------
// Helpers
// -----------------------------------------
const currency = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) => {
  if (!date) return "All";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
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

const SALE_STATUS_OPTIONS = [
  { label: "All", value: null },
  { label: "Active", value: "active" },
  { label: "Cancelled", value: "cancelled" },
];

const CHUNK_SIZE = 25;

export default function SalesReportPage() {
  // ── Core state ──────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeRange, setActiveRange] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(null);
  const [saleStatus, setSaleStatus] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const debounceTimerRef = useRef(null);
  const searchBoxRef = useRef(null);
  const dropdownBoxRef = useRef(null);

  const [storedata, setStoredata] = useState({});

  const allInvoicesRef = useRef([]);
  const cursorRef = useRef(0);

  // ── Store info (for PDF header) ────────────────────────────────────────
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

  const storeName = storedata?.name || storedata?.storeName || "N/A";
  const address = (() => {
    if (!storedata?.address) return "N/A";
    if (typeof storedata.address === "object") {
      const a = storedata.address;
      return [a.street, a.city, a.state, a.postalCode].filter(Boolean).join(", ");
    }
    return String(storedata.address);
  })();
  const contactNo = storedata?.contactNo || storedata?.contactNumber || "N/A";
  const gstin = storedata?.gstNumber || storedata?.gstin || "N/A";

  // ── Close suggestions / dropdowns on outside click ─────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Suggestions ─────────────────────────────────────────────────────────
  const fetchDefaultSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const res = await api.get(`/product/report/suggestions?_=${Date.now()}`);
      const list = res?.data?.data ?? res?.data ?? [];
      setSuggestions(Array.isArray(list) ? list : []);
    } catch (e) {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSearchFocus = () => {
    setShowSuggestions(true);
    if (!searchText.trim()) fetchDefaultSuggestions();
  };

  const handleSearchChange = (e) => {
    const text = e.target.value;
    setSearchText(text);
    setShowSuggestions(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!text.trim()) {
      fetchDefaultSuggestions();
      return;
    }
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setSuggestionsLoading(true);
        const res = await api.get(
          `/product/report/suggestions?q=${encodeURIComponent(text.trim())}`
        );
        const list = res?.data?.data ?? res?.data ?? [];
        setSuggestions(Array.isArray(list) ? list : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const selectSuggestion = (value) => {
    setSearchText(value);
    setShowSuggestions(false);
    setSuggestions([]);
    setInvoiceSearch(value);
  };

  const submitSearch = (e) => {
    e?.preventDefault?.();
    setShowSuggestions(false);
    setInvoiceSearch(searchText.trim());
  };

  const clearSearch = () => {
    setSearchText("");
    setInvoiceSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // ── Chunk loading ───────────────────────────────────────────────────────
  const loadNextChunk = useCallback(() => {
    const start = cursorRef.current;
    const end = start + CHUNK_SIZE;
    const nextSlice = allInvoicesRef.current.slice(start, end);
    if (nextSlice.length === 0) return;
    setInvoices((prev) => [...prev, ...nextSlice]);
    cursorRef.current = end;
  }, []);

  const handleLoadMore = () => {
    if (loadingMore) return;
    if (cursorRef.current >= allInvoicesRef.current.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      loadNextChunk();
      setLoadingMore(false);
    }, 0);
  };

  // ── Fetch invoices ──────────────────────────────────────────────────────
  const fetchInvoices = async () => {
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
      if (saleStatus) extraParams.push(`status=${saleStatus}`);
      if (invoiceSearch) extraParams.push(`invoiceSearch=${encodeURIComponent(invoiceSearch)}`);
      if (extraParams.length) {
        query += query ? `&${extraParams.join("&")}` : `?${extraParams.join("&")}`;
      }

      const res = await api.get(`/product/sale-report${query}`);
      let rows = res?.data?.docs ?? res?.data?.data ?? res?.data ?? [];
      if (!Array.isArray(rows)) rows = [];

      if (!activeRange && startDate && endDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        rows = rows.filter((inv) => {
          const d = new Date(inv.invoiceDate);
          return d >= sDate && d <= eDate;
        });
      }

      rows = [...rows].sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

      allInvoicesRef.current = rows;
      cursorRef.current = 0;
      setInvoices([]);
      loadNextChunk();
      setHasFetched(true);
      if (!rows.length) {
        toast.error("No records found for the selected filters.");
      }
    } catch (e) {
      console.error("Report fetch error:", e?.message);
      toast.error("Failed to fetch report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hasDateRange = startDate && endDate;
    const hasDropdownFilter =
      paymentMethod || paymentStatusFilter || saleStatus || invoiceSearch;
    if (hasDateRange || hasDropdownFilter) fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, activeRange, paymentMethod, paymentStatusFilter, saleStatus, invoiceSearch]);

  // ── Quick range helpers ─────────────────────────────────────────────────
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
    const currentMonth = today.getMonth() + 1;
    const fyStart =
      currentMonth >= 4
        ? new Date(today.getFullYear(), 3, 1)
        : new Date(today.getFullYear() - 1, 3, 1);
    setStartDate(fyStart);
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
  const clearAllFilters = () => {
    setActiveRange(null);
    setStartDate(null);
    setEndDate(null);
    setPaymentMethod(null);
    setPaymentStatusFilter(null);
    setSaleStatus(null);
    clearSearch();
    allInvoicesRef.current = [];
    cursorRef.current = 0;
    setInvoices([]);
    setHasFetched(false);
  };

  const formattedRange = useMemo(
    () => `${startDate ? formatDate(startDate) : "All"} - ${endDate ? formatDate(endDate) : "All"}`,
    [startDate, endDate]
  );

  // ── Totals (over FULL dataset) ─────────────────────────────────────────
  const totals = useMemo(() => {
    const toNum = (v) => Number(v || 0);
    const all = allInvoicesRef.current;
    const gstTotal = all.reduce((s, r) => s + toNum(r.gstTotal), 0);
    return {
      count: all.length,
      taxableValue: all.reduce((s, r) => s + toNum(r.taxableValue), 0),
      gstTotal,
      cgstTotal: gstTotal / 2,
      sgstTotal: gstTotal / 2,
      discountTotal: all.reduce((s, r) => s + toNum(r.discountTotal), 0),
      grandTotal: all.reduce((s, r) => s + toNum(r.grandTotal), 0),
    };
  }, [invoices]);

  // ── PDF export (browser print → Save as PDF) ───────────────────────────
  const buildHTML = () => {
    const safe = (v) => (v === undefined || v === null || v === "" ? "-" : String(v));
    const sorted = [...allInvoicesRef.current].sort(
      (a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate)
    );

    const headRow = `
      <tr>
        <th align="left">Date</th>
        <th align="left">Invoice No</th>
        <th align="left">Customer</th>
        <th align="left">Mobile</th>
        <th align="left">Address</th>
        <th align="right">Taxable Value</th>
        <th align="right">CGST Amt</th>
        <th align="right">SGST Amt</th>
        <th align="right">Total GST</th>
        <th align="right">Discount</th>
        <th align="right">Grand Total</th>
      </tr>`;

    const bodyRows = sorted
      .map((inv) => {
        const date = inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : "-";
        const gstTotal = Number(inv.gstTotal || 0);
        const cgstAmt = gstTotal / 2;
        const sgstAmt = gstTotal / 2;
        return `
        <tr>
          <td>${date}</td>
          <td>${safe(inv.invoiceNumber || inv._id)}</td>
          <td>${safe(inv.customerName)}</td>
          <td>${safe(inv.customerMobile)}</td>
          <td>${safe(inv.customerAddress)}</td>
          <td align="right">${currency(inv.taxableValue)}</td>
          <td align="right">${currency(cgstAmt)}</td>
          <td align="right">${currency(sgstAmt)}</td>
          <td align="right">${currency(gstTotal)}</td>
          <td align="right">${currency(inv.discountTotal)}</td>
          <td align="right">${currency(inv.grandTotal)}</td>
        </tr>`;
      })
      .join("");

    return `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Sales Register</title>
        <style>
          @page { size: A4 landscape; margin: 20px; }
          body { font-family: -apple-system, Roboto, "Segoe UI", Arial; color: #111; margin: 0; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          .muted { color: #666; margin-bottom: 16px; }
          .summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
          .chip { border-radius: 16px; padding: 6px 12px; background: #f2f2f2; font-size: 12px; color: #333; border: 1px solid #ddd; }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          th, td { border-bottom: 1px solid #eee; padding: 8px 6px; font-size: 11px; word-wrap: break-word; }
          th { background: #fafafa; font-weight: 700; }
          th:nth-child(n+6), td:nth-child(n+6) { text-align: right; }
          .grand-total td { border: 1px solid #ddd; padding: 6px; font-size: 11px; font-weight: 700; }
          .footer { margin-top: 18px; border-top: 1.5px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; align-items: center; }
        </style>
      </head>
      <body>
        <table style="width:100%; border-collapse:collapse; margin-bottom:8px;">
          <tr><td style="text-align:center;"><strong style="font-size:14px;">${storeName}</strong></td></tr>
          <tr><td style="text-align:center; font-size:10px; color:#444;">
            ${address} &nbsp;|&nbsp; <b>Ph:</b> ${contactNo} ${gstin !== "N/A" ? `&nbsp;|&nbsp; <b>GSTIN:</b> ${gstin}` : ""}
          </td></tr>
        </table>

        <h1>Sales Register</h1>
        <div class="muted">Period : ${formattedRange}</div>

        <div class="summary">
          <div class="chip">Invoices: ${totals.count}</div>
          <div class="chip">Taxable Value: ${currency(totals.taxableValue)}</div>
          <div class="chip">CGST: ${currency(totals.cgstTotal)}</div>
          <div class="chip">SGST: ${currency(totals.sgstTotal)}</div>
          <div class="chip">Discount: ${currency(totals.discountTotal)}</div>
          <div class="chip">Grand Total: ${currency(totals.grandTotal)}</div>
        </div>

        <table>
          <thead>${headRow}</thead>
          <tbody>${bodyRows || `<tr><td colspan="11" align="center">No records</td></tr>`}</tbody>
          <tfoot>
            <tr class="grand-total">
              <td colspan="5">TOTAL</td>
              <td align="right">${currency(totals.taxableValue)}</td>
              <td align="right">${currency(totals.cgstTotal)}</td>
              <td align="right">${currency(totals.sgstTotal)}</td>
              <td align="right">${currency(totals.gstTotal)}</td>
              <td></td>
              <td align="right">${currency(totals.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <span>AMDAANI — Smart Business Management</span>
          <span>Generated: ${new Date().toLocaleString("en-IN")}</span>
        </div>
      </body>
      </html>`;
  };

  const exportPDF = () => {
    if (!allInvoicesRef.current.length) {
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

  // ── Excel export (SheetJS) ─────────────────────────────────────────────
  const exportExcel = () => {
    if (!allInvoicesRef.current.length) {
      toast.error("No records to export.");
      return;
    }
    try {
      const sorted = [...allInvoicesRef.current].sort(
        (a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate)
      );

      const data = sorted.map((inv) => {
        const date = inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : "-";
        const gstTotal = Number(inv.gstTotal || 0);
        return {
          Date: date,
          "Invoice No": inv.invoiceNumber || inv._id || "-",
          Customer: inv.customerName || "-",
          Mobile: inv.customerMobile || "-",
          Address: inv.customerAddress || "-",
          "Taxable Value": Number(inv.taxableValue || 0),
          "CGST Amt": gstTotal / 2,
          "SGST Amt": gstTotal / 2,
          "GST Amt": gstTotal,
          Discount: Number(inv.discountTotal || 0),
          "Grand Total": Number(inv.grandTotal || 0),
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = Object.keys(data[0]).map((key) => ({ wch: Math.max(12, key.length + 2) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });

      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Sales_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  // ── Dropdown filter config ─────────────────────────────────────────────
  const dropdownFilters = [
    {
      key: "paymentMethod",
      title: "Payment Mode",
      value: paymentMethod,
      setValue: setPaymentMethod,
      options: PAYMENT_METHOD_OPTIONS,
    },
    {
      key: "paymentStatus",
      title: "Payment Status",
      value: paymentStatusFilter,
      setValue: setPaymentStatusFilter,
      options: PAYMENT_STATUS_OPTIONS,
    },
    {
      key: "saleStatus",
      title: "Sale Status",
      value: saleStatus,
      setValue: setSaleStatus,
      options: SALE_STATUS_OPTIONS,
    },
  ];

  const canGenerate =
    startDate || endDate || paymentMethod || paymentStatusFilter || saleStatus || invoiceSearch;

  const hasMore = cursorRef.current < allInvoicesRef.current.length;
  const hasData = invoices.length > 0;

  const emptyMessage = !canGenerate
    ? "Select a date range or filter and tap Generate."
    : hasFetched
    ? "No records found for the selected filters."
    : "Tap Generate to load the report.";

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/40">
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Sales Report</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportPDF} disabled={!hasData || loading} className="h-9 px-3 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-4 h-4" />PDF
            </button>
            <button onClick={exportExcel} disabled={!hasData || loading} className="h-9 px-3 rounded-lg border border-slate-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium">
              <FileSpreadsheet className="w-4 h-4" />Excel
            </button>
          </div>
        </div>

        {/* Single-row filter toolbar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2 flex-wrap" ref={dropdownBoxRef}>
          {/* Search */}
          <div className="relative shrink-0" ref={searchBoxRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <form onSubmit={submitSearch}>
              <input
                type="text"
                placeholder="Search invoice, customer, mobile"
                value={searchText}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                className="h-9 w-[210px] pl-8 pr-8 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </form>
            {searchText ? (
              <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : suggestionsLoading ? (
              <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
            ) : null}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-[260px] bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <button
                    key={`${item.type}-${item.value}-${idx}`}
                    onClick={() => selectSuggestion(item.value)}
                    className={`w-full text-left px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 ${
                      idx < suggestions.length - 1 ? "border-b border-slate-100" : ""
                    }`}
                  >
                    {item.type === "invoice" ? (
                      <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    ) : item.type === "mobile" ? (
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 shrink-0" />

          {/* Date range */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input type="date" value={toInputDate(startDate)} max={toInputDate(new Date())}
                onChange={(e) => { setActiveRange(null); setStartDate(e.target.value ? new Date(e.target.value) : null); }}
                className="h-9 w-[150px] pl-8 pr-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
            </div>
            <span className="text-slate-300 text-xs">–</span>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input type="date" value={toInputDate(endDate)} max={toInputDate(new Date())}
                onChange={(e) => { setActiveRange(null); setEndDate(e.target.value ? new Date(e.target.value) : null); }}
                className="h-9 w-[150px] pl-8 pr-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
            </div>
          </div>

          {/* Today / Yesterday / This Week */}
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { value: "today", label: "Today", fn: applyToday },
              { value: "yesterday", label: "Yesterday", fn: applyYesterday },
              { value: "thisWeek", label: "This Week", fn: applyThisWeek },
            ].map((opt) => (
              <button key={opt.value} onClick={opt.fn} disabled={loading}
                className={`h-9 px-3 rounded-lg text-[12.5px] font-semibold transition-colors ${activeRange === opt.value ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* This Year / This Month / Prev Month */}
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { label: "This Year", fn: applyThisYear },
              { label: "This Month", fn: applyThisMonth },
              { label: "Prev Month", fn: applyPreviousMonth },
            ].map(({ label, fn }) => (
              <button key={label} onClick={fn} disabled={loading}
                className="h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {label}
              </button>
            ))}
          </div>

          {/* Dropdown filters */}
          <div className="flex items-center gap-1.5 shrink-0">
            {dropdownFilters.map((filter) => {
              const selectedOption = filter.options.find((o) => o.value === filter.value);
              return (
                <DropdownMenu key={filter.key}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`h-9 px-3 rounded-lg border text-[12.5px] font-medium flex items-center gap-1 ${
                        filter.value != null
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate max-w-[100px]">{selectedOption?.label || filter.title}</span>
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    {filter.options.map((opt) => (
                      <DropdownMenuItem
                        key={String(opt.value)}
                        onClick={() => filter.setValue(opt.value)}
                        className="flex items-center justify-between text-sm"
                      >
                        {opt.label}
                        {filter.value === opt.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>

          <button onClick={clearAllFilters} disabled={loading} title="Clear filters"
            className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40">
            <CalendarX2 className="w-4 h-4" />
          </button>

          <button onClick={fetchInvoices} disabled={!canGenerate || loading}
            className="h-9 px-4 ml-auto shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[13px] font-semibold flex items-center gap-2 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Generate"}
          </button>
        </div>
      </div>

      {/* ---------------- CONTENT (scrolls internally) ---------------- */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
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
            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3.5 mb-4">
              <div className="text-xs text-slate-400 mb-2">{formattedRange}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryStat label="Invoices" value={String(totals.count)} />
                <SummaryStat label="Taxable Value" value={currency(totals.taxableValue)} />
                <SummaryStat label="Total GST" value={currency(totals.gstTotal)} accent="text-red-600" />
                <SummaryStat label="Grand Total" value={currency(totals.grandTotal)} accent="text-blue-600" bold />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Sales Register</h2>
                <span className="text-xs text-slate-400">{totals.count} invoices</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left font-semibold px-4 py-3">Date</th>
                      <th className="text-left font-semibold px-4 py-3">Invoice No</th>
                      <th className="text-left font-semibold px-4 py-3">Customer</th>
                      <th className="text-left font-semibold px-4 py-3">Mobile</th>
                      <th className="text-right font-semibold px-4 py-3">GST</th>
                      <th className="text-right font-semibold px-4 py-3">Total</th>
                      <th className="text-left font-semibold px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map((inv, idx) => (
                      <tr
                        key={String(inv._id || inv.invoiceNumber || idx)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => (window.location.href = `/dashboard/sales/${inv._id}`)}
                      >
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {inv.invoiceDate
                            ? new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          #{inv.invoiceNumber || inv._id}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{inv.customerName || "-"}</td>
                        <td className="px-4 py-3 text-slate-500">{inv.customerMobile || "-"}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{currency(inv.gstTotal)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{currency(inv.grandTotal)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              inv.paymentStatus === "paid"
                                ? "bg-emerald-50 text-emerald-600"
                                : inv.paymentStatus === "partial"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {inv.paymentStatus || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold text-slate-800">
                      <td colSpan={4} className="px-4 py-3 text-right">TOTAL</td>
                      <td className="px-4 py-3 text-right">{currency(totals.gstTotal)}</td>
                      <td className="px-4 py-3 text-right">{currency(totals.grandTotal)}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {hasMore && (
                <div className="p-4 border-t border-slate-100 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="h-9 px-5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
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
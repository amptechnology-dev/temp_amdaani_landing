"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Calendar,
  CalendarX2,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Phone,
  User,
} from "lucide-react";
import api from "../../utils/api";

// ── helpers ──────────────────────────────────────────────────────────────
const currency = (v) => `₹${Number(v || 0).toFixed(2)}`;
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : String(v));
const num = (v) => Number(v || 0);

const formatShort = (date) => {
  if (!date) return "All";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
};

const toInputDate = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

// Derives payment status the same way the RN app does — from due/paid, not a stored field
const getPaymentStatus = (inv) => {
  const due = num(inv.amountDue);
  const paid = num(inv.amountPaid);
  return due <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
};

const statusColor = (status) =>
  status === "paid" ? "text-emerald-600" : status === "partial" ? "text-amber-600" : "text-red-600";

const statusBg = (status) =>
  status === "paid" ? "bg-emerald-50" : status === "partial" ? "bg-amber-50" : "bg-red-50";

// Falls back to summing invoices[] when the API doesn't already provide rollups
// (mirrors getCustomerTotals from the RN SundryDebtorsReport)
const getCustomerTotals = (c) => {
  if (c.totalSaleAmount !== undefined) {
    return {
      totalSale: num(c.totalSaleAmount),
      totalPaid: num(c.totalPaidAmount),
      totalDue: num(c.totalDueAmount),
      totalInvoices: num(c.totalInvoices),
    };
  }
  const invoices = c.invoices || [];
  return {
    totalSale: invoices.reduce((s, i) => s + num(i.grandTotal), 0),
    totalPaid: invoices.reduce((s, i) => s + num(i.amountPaid), 0),
    totalDue: invoices.reduce((s, i) => s + num(i.amountDue), 0),
    totalInvoices: invoices.length,
  };
};

const getCustomerId = (c, idx) => c._id ?? c.customerName ?? `row-${idx}`;

export default function DebtorsReportPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeRange, setActiveRange] = useState(null); // 'today' | 'yesterday' | 'thisWeek' | null

  const [expandedCustomers, setExpandedCustomers] = useState({});

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
  const contactNo = storedata?.contactNo || storedata?.contactNumber || "";
  const gstin = storedata?.gstNumber || storedata?.gstin || "";

  const formattedRange = useMemo(
    () => `${formatShort(startDate)} – ${formatShort(endDate)}`,
    [startDate, endDate]
  );

  const toggleCustomer = useCallback((id) => {
    setExpandedCustomers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ── fetch ────────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
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

      const res = await api.get(`/invoice/customer-wise-report${query}`);
      let rows = res?.data?.data ?? res?.data ?? [];
      if (!Array.isArray(rows)) rows = [];

      setCustomers(rows);
      setExpandedCustomers({});
      setHasFetched(true);
      if (!rows.length) {
        toast.error("No records found for the selected filters.");
      }
    } catch (e) {
      console.error("Debtors report fetch error:", e?.message);
      toast.error("Failed to fetch debtors report.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [activeRange, startDate, endDate]);

  // auto-fetch when a date range changes
  useEffect(() => {
    const hasDateRange = startDate && endDate;
    if (hasDateRange) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, activeRange]);

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
    setExpandedCustomers({});
    setCustomers([]);
    setHasFetched(false);
  };

  // ── totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    return customers.reduce(
      (acc, c) => {
        const ct = getCustomerTotals(c);
        return {
          customerCount: acc.customerCount + 1,
          invoiceCount: acc.invoiceCount + ct.totalInvoices,
          totalSale: acc.totalSale + ct.totalSale,
          totalPaid: acc.totalPaid + ct.totalPaid,
          totalDue: acc.totalDue + ct.totalDue,
        };
      },
      { customerCount: 0, invoiceCount: 0, totalSale: 0, totalPaid: 0, totalDue: 0 }
    );
  }, [customers]);

  const hasData = customers.length > 0;

  const emptyMessage = !startDate && !endDate
    ? "Select a date range and tap Generate."
    : hasFetched
    ? "No records found for the selected filters."
    : "Tap Generate to load the report.";

  // ── PDF export ───────────────────────────────────────────────────────
  const buildHTML = () => {
    const customerBlocks = customers
      .map((customer) => {
        const ct = getCustomerTotals(customer);
        const invoiceRows = (customer.invoices || [])
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          .map((inv) => {
            const ps = getPaymentStatus(inv);
            const sColor = ps === "paid" ? "#2e7d32" : ps === "partial" ? "#e65100" : "#c62828";
            return `
              <tr>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${
                  inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN") : "-"
                }</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${safe(inv.invoiceNumber)}</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;text-align:right;">${currency(inv.grandTotal)}</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;text-align:right;">${currency(inv.amountPaid)}</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;text-align:right;color:${
                  num(inv.amountDue) > 0 ? "#c62828" : "#2e7d32"
                };">${currency(inv.amountDue)}</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;text-align:center;color:${sColor};font-weight:600;text-transform:capitalize;">${ps}</td>
              </tr>`;
          })
          .join("");

        return `
          <div style="margin-bottom:18px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
            <div style="background:#f5f5f5;padding:8px 12px;border-bottom:1px solid #e0e0e0;display:flex;justify-content:space-between;">
              <div>
                <strong style="font-size:12px;">${safe(customer.customerName) === "-" ? "Walk-in Customer" : safe(customer.customerName)}</strong>
                ${customer.customerMobile ? `<span style="font-size:10px;color:#555;margin-left:8px;">Ph: ${customer.customerMobile}</span>` : ""}
              </div>
              <div style="font-size:10px;color:#555;">${ct.totalInvoices} invoices</div>
            </div>
            <div style="padding:6px 12px;background:#fafafa;border-bottom:1px solid #e0e0e0;display:flex;gap:12px;flex-wrap:wrap;">
              <span style="font-size:10px;"><b>Sale:</b> ${currency(ct.totalSale)}</span>
              <span style="font-size:10px;color:#2e7d32;"><b>Paid:</b> ${currency(ct.totalPaid)}</span>
              <span style="font-size:10px;color:${ct.totalDue > 0 ? "#c62828" : "#2e7d32"};"><b>Due:</b> ${currency(ct.totalDue)}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#fafafa;">
                  <th style="padding:6px 10px;font-size:10px;text-align:left;border-bottom:1px solid #ddd;">Date</th>
                  <th style="padding:6px 10px;font-size:10px;text-align:left;border-bottom:1px solid #ddd;">Invoice No</th>
                  <th style="padding:6px 10px;font-size:10px;text-align:right;border-bottom:1px solid #ddd;">Grand Total</th>
                  <th style="padding:6px 10px;font-size:10px;text-align:right;border-bottom:1px solid #ddd;">Paid</th>
                  <th style="padding:6px 10px;font-size:10px;text-align:right;border-bottom:1px solid #ddd;">Due</th>
                  <th style="padding:6px 10px;font-size:10px;text-align:center;border-bottom:1px solid #ddd;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceRows || `<tr><td colspan="6" style="padding:10px;text-align:center;font-size:11px;color:#888;">No invoices</td></tr>`}
              </tbody>
            </table>
          </div>`;
      })
      .join("");

    return `
      <html><head><meta charset="utf-8"/>
      <style>
        @page { size: A4 portrait; margin: 20px; }
        body { font-family:Roboto,Arial; margin:0; padding:16px; color:#111; font-size:11px; }
        h1   { font-size:18px; margin-bottom:2px; }
        .sub { color:#666; margin-bottom:14px; }
        .chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; }
        .chip  { background:#f0f0f0; border:1px solid #ddd; border-radius:12px; padding:4px 10px; font-size:10px; }
        .footer{ margin-top:14px; color:#888; font-size:9px; display:flex; justify-content:space-between; }
      </style></head><body>
        <h2 style="text-align:center;">${storeName}</h2>
        ${address ? `<p style="text-align:center;">${address}${contactNo ? ` | Ph: ${contactNo}` : ""}</p>` : ""}
        ${gstin ? `<p style="text-align:center;">GSTIN: ${gstin}</p>` : ""}
        <h1>Sundry Debtors Report</h1>
        <div class="sub">Period: ${formattedRange}</div>
        <div class="chips">
          <div class="chip">Customers: ${totals.customerCount}</div>
          <div class="chip">Invoices: ${totals.invoiceCount}</div>
          <div class="chip">Total Sale: ${currency(totals.totalSale)}</div>
          <div class="chip">Total Paid: ${currency(totals.totalPaid)}</div>
          <div class="chip" style="background:#fdeaea;border-color:#c62828;">
            <b>Total Due: ${currency(totals.totalDue)}</b>
          </div>
        </div>
        ${customerBlocks || `<p style="color:#888;">No records found.</p>`}
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
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryData = customers.map((c) => {
        const ct = getCustomerTotals(c);
        return {
          "Customer Name": c.customerName || "Walk-in Customer",
          Mobile: c.customerMobile || "-",
          "Total Invoices": ct.totalInvoices,
          "Total Sale": ct.totalSale,
          "Total Paid": ct.totalPaid,
          "Total Due": ct.totalDue,
        };
      });
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary["!cols"] = Object.keys(summaryData[0] || {}).map((k) => ({ wch: Math.max(14, k.length + 2) }));
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Sheet 2: All invoices flat
      const invoiceRows = [];
      customers.forEach((c) => {
        (c.invoices || [])
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          .forEach((inv) => {
            invoiceRows.push({
              "Customer Name": c.customerName || "Walk-in Customer",
              "Customer Mobile": c.customerMobile || "-",
              "Invoice No": inv.invoiceNumber || "-",
              Date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN") : "-",
              "Grand Total": num(inv.grandTotal),
              "Amount Paid": num(inv.amountPaid),
              "Amount Due": num(inv.amountDue),
              "Payment Status": getPaymentStatus(inv),
            });
          });
      });

      if (invoiceRows.length) {
        const wsInvoices = XLSX.utils.json_to_sheet(invoiceRows);
        wsInvoices["!cols"] = Object.keys(invoiceRows[0]).map((k) => ({ wch: Math.max(14, k.length + 2) }));
        XLSX.utils.book_append_sheet(wb, wsInvoices, "All Invoices");
      }

      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Sundry_Debtors_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
          <h1 className="text-lg font-bold text-slate-900">Sundry Debtors Report</h1>
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

        <button
          onClick={fetchReport}
          disabled={loading || (!startDate && !endDate)}
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
              <SummaryStat label="Customers" value={String(totals.customerCount)} />
              <SummaryStat label="Invoices" value={String(totals.invoiceCount)} />
              <SummaryStat label="Sale" value={currency(totals.totalSale)} />
              <SummaryStat label="Paid" value={currency(totals.totalPaid)} accent="text-emerald-600" />
              <SummaryStat
                label="Due"
                value={currency(totals.totalDue)}
                accent={totals.totalDue > 0 ? "text-red-600" : "text-emerald-600"}
                bold
              />
            </div>
          </div>

          {/* Customer list */}
          <div className="space-y-3">
            {customers.map((customer, idx) => {
              const id = getCustomerId(customer, idx);
              const isExpanded = !!expandedCustomers[id];
              const ct = getCustomerTotals(customer);
              const sortedInvoices = [...(customer.invoices || [])].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
              );

              return (
                <div
                  key={id}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden"
                >
                  {/* Customer header row */}
                  <button
                    onClick={() => toggleCustomer(id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-sm font-bold text-slate-800 truncate">
                          {customer.customerName || "Walk-in Customer"}
                        </span>
                      </div>
                      {customer.customerMobile && (
                        <div className="flex items-center gap-1 mt-1 pl-6">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">{customer.customerMobile}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 mr-3 shrink-0">
                      {ct.totalInvoices} invoices
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {/* Customer summary chips */}
                  <div className="grid grid-cols-3 gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                    <SummaryStat label="Sale" value={currency(ct.totalSale)} />
                    <SummaryStat label="Paid" value={currency(ct.totalPaid)} accent="text-emerald-600" />
                    <SummaryStat
                      label="Due"
                      value={currency(ct.totalDue)}
                      accent={ct.totalDue > 0 ? "text-red-600" : "text-emerald-600"}
                    />
                  </div>

                  {/* Invoice table */}
                  {isExpanded && (
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                            <th className="text-left font-semibold px-4 py-2.5">Date</th>
                            <th className="text-left font-semibold px-4 py-2.5">Invoice No</th>
                            <th className="text-right font-semibold px-4 py-2.5">Grand Total</th>
                            <th className="text-right font-semibold px-4 py-2.5">Paid</th>
                            <th className="text-right font-semibold px-4 py-2.5">Due</th>
                            <th className="text-center font-semibold px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">
                                No invoices
                              </td>
                            </tr>
                          ) : (
                            sortedInvoices.map((inv, i) => {
                              const ps = getPaymentStatus(inv);
                              return (
                                <tr key={inv._id || i} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN") : "-"}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-700">{safe(inv.invoiceNumber)}</td>
                                  <td className="px-4 py-2.5 text-right text-slate-600">{currency(inv.grandTotal)}</td>
                                  <td className="px-4 py-2.5 text-right text-emerald-600">{currency(inv.amountPaid)}</td>
                                  <td
                                    className={`px-4 py-2.5 text-right font-medium ${
                                      num(inv.amountDue) > 0 ? "text-red-600" : "text-emerald-600"
                                    }`}
                                  >
                                    {currency(inv.amountDue)}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBg(
                                        ps
                                      )} ${statusColor(ps)}`}
                                    >
                                      {ps}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
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
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
  Store,
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

const statusColor = (status) =>
  status === "paid" ? "text-emerald-600" : status === "partial" ? "text-amber-600" : "text-red-600";

const statusBg = (status) =>
  status === "paid" ? "bg-emerald-50" : status === "partial" ? "bg-amber-50" : "bg-red-50";

export default function CreditorsReportPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeRange, setActiveRange] = useState(null); // 'today' | 'yesterday' | 'thisWeek' | null

  const [expandedVendors, setExpandedVendors] = useState({});

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

  const toggleVendor = useCallback((id) => {
    setExpandedVendors((prev) => ({ ...prev, [id]: !prev[id] }));
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

      const res = await api.get(`/purchase/vendor-wise-report${query}`);
      let rows = res?.data?.data ?? res?.data ?? [];
      if (!Array.isArray(rows)) rows = [];

      setVendors(rows);
      setExpandedVendors({});
      setHasFetched(true);
      if (!rows.length) {
        toast.error("No records found for the selected filters.");
      }
    } catch (e) {
      console.error("Creditors report fetch error:", e?.message);
      toast.error("Failed to fetch creditors report.");
      setVendors([]);
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
    setExpandedVendors({});
    setVendors([]);
    setHasFetched(false);
  };

  // ── totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    return vendors.reduce(
      (acc, v) => ({
        vendorCount: acc.vendorCount + 1,
        invoiceCount: acc.invoiceCount + num(v.totalInvoices),
        totalPurchase: acc.totalPurchase + num(v.totalPurchaseAmount),
        totalPaid: acc.totalPaid + num(v.totalPaidAmount),
        totalDue: acc.totalDue + num(v.totalDueAmount),
      }),
      { vendorCount: 0, invoiceCount: 0, totalPurchase: 0, totalPaid: 0, totalDue: 0 }
    );
  }, [vendors]);

  const hasData = vendors.length > 0;

  const emptyMessage = !startDate && !endDate
    ? "Select a date range and tap Generate."
    : hasFetched
    ? "No records found for the selected filters."
    : "Tap Generate to load the report.";

  // ── PDF export ───────────────────────────────────────────────────────
  const buildHTML = () => {
    const vendorBlocks = vendors
      .map((vendor) => {
        const invoiceRows = (vendor.invoices || [])
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map((inv) => {
            const sColor =
              inv.paymentStatus === "paid" ? "#2e7d32" : inv.paymentStatus === "partial" ? "#e65100" : "#c62828";
            return `
              <tr>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${
                  inv.date ? new Date(inv.date).toLocaleDateString("en-IN") : "-"
                }</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${safe(inv.invoiceNo)}</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;text-align:right;">${currency(inv.grandTotal)}</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;text-align:right;">${currency(inv.amountPaid)}</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;text-align:right;color:${
                  inv.amountDue > 0 ? "#c62828" : "#2e7d32"
                };">${currency(inv.amountDue)}</td>
                <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;text-align:center;color:${sColor};font-weight:600;text-transform:capitalize;">${safe(
              inv.paymentStatus
            )}</td>
              </tr>`;
          })
          .join("");

        return `
          <div style="margin-bottom:18px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
            <div style="background:#f5f5f5;padding:8px 12px;border-bottom:1px solid #e0e0e0;display:flex;justify-content:space-between;">
              <div>
                <strong style="font-size:12px;">${safe(vendor.vendorName)}</strong>
                ${vendor.vendorMobile ? `<span style="font-size:10px;color:#555;margin-left:8px;">Ph: ${vendor.vendorMobile}</span>` : ""}
                ${vendor.vendorGstNumber ? `<span style="font-size:10px;color:#555;margin-left:8px;">GST: ${vendor.vendorGstNumber}</span>` : ""}
              </div>
              <div style="font-size:10px;color:#555;">${vendor.totalInvoices || 0} invoices</div>
            </div>
            <div style="padding:6px 12px;background:#fafafa;border-bottom:1px solid #e0e0e0;display:flex;gap:12px;flex-wrap:wrap;">
              <span style="font-size:10px;"><b>Purchase:</b> ${currency(vendor.totalPurchaseAmount)}</span>
              <span style="font-size:10px;color:#2e7d32;"><b>Paid:</b> ${currency(vendor.totalPaidAmount)}</span>
              <span style="font-size:10px;color:${vendor.totalDueAmount > 0 ? "#c62828" : "#2e7d32"};"><b>Due:</b> ${currency(vendor.totalDueAmount)}</span>
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
        <h1>Sundry Creditors Report</h1>
        <div class="sub">Period: ${formattedRange}</div>
        <div class="chips">
          <div class="chip">Vendors: ${totals.vendorCount}</div>
          <div class="chip">Invoices: ${totals.invoiceCount}</div>
          <div class="chip">Total Purchase: ${currency(totals.totalPurchase)}</div>
          <div class="chip">Total Paid: ${currency(totals.totalPaid)}</div>
          <div class="chip" style="background:#fdeaea;border-color:#c62828;">
            <b>Total Due: ${currency(totals.totalDue)}</b>
          </div>
        </div>
        ${vendorBlocks || `<p style="color:#888;">No records found.</p>`}
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
      const summaryData = vendors.map((v) => ({
        "Vendor Name": v.vendorName || "-",
        Mobile: v.vendorMobile || "-",
        "GST Number": v.vendorGstNumber || "-",
        "Total Invoices": v.totalInvoices || 0,
        "Total Purchase": num(v.totalPurchaseAmount),
        "Total Paid": num(v.totalPaidAmount),
        "Total Due": num(v.totalDueAmount),
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary["!cols"] = Object.keys(summaryData[0] || {}).map((k) => ({ wch: Math.max(14, k.length + 2) }));
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Sheet 2: All invoices flat
      const invoiceRows = [];
      vendors.forEach((v) => {
        (v.invoices || [])
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .forEach((inv) => {
            invoiceRows.push({
              "Vendor Name": v.vendorName || "-",
              "Vendor Mobile": v.vendorMobile || "-",
              "Invoice No": inv.invoiceNo || "-",
              Date: inv.date ? new Date(inv.date).toLocaleDateString("en-IN") : "-",
              "Grand Total": num(inv.grandTotal),
              "Amount Paid": num(inv.amountPaid),
              "Amount Due": num(inv.amountDue),
              "Payment Status": inv.paymentStatus || "-",
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
      a.download = `Sundry_Creditors_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/40">
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Sundry Creditors Report</h1>
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2 flex-wrap">
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

          <div className="h-6 w-px bg-slate-200 shrink-0" />

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

          <button onClick={clearAll} disabled={loading} title="Clear filters"
            className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40">
            <CalendarX2 className="w-4 h-4" />
          </button>

          <button onClick={fetchReport} disabled={loading || (!startDate && !endDate)}
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
            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3.5 mb-4">
              <div className="text-xs text-slate-400 mb-2">{formattedRange}</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryStat label="Vendors" value={String(totals.vendorCount)} />
                <SummaryStat label="Invoices" value={String(totals.invoiceCount)} />
                <SummaryStat label="Purchase" value={currency(totals.totalPurchase)} />
                <SummaryStat label="Paid" value={currency(totals.totalPaid)} accent="text-emerald-600" />
                <SummaryStat label="Due" value={currency(totals.totalDue)} accent={totals.totalDue > 0 ? "text-red-600" : "text-emerald-600"} bold />
              </div>
            </div>

            <div className="space-y-3">
              {vendors.map((vendor) => {
                const isExpanded = !!expandedVendors[vendor._id];
                const sortedInvoices = [...(vendor.invoices || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
                return (
                  <div key={vendor._id} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
                    <button onClick={() => toggleVendor(vendor._id)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-sm font-bold text-slate-800 truncate">{safe(vendor.vendorName)}</span>
                        </div>
                        {(vendor.vendorMobile || vendor.vendorGstNumber) && (
                          <div className="flex items-center gap-3 mt-1 pl-6">
                            {vendor.vendorMobile && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Phone className="w-3 h-3" />{vendor.vendorMobile}
                              </span>
                            )}
                            {vendor.vendorGstNumber && <span className="text-xs text-slate-400">GST: {vendor.vendorGstNumber}</span>}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 mr-3 shrink-0">{vendor.totalInvoices || 0} invoices</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    </button>

                    <div className="grid grid-cols-3 gap-4 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                      <SummaryStat label="Purchase" value={currency(vendor.totalPurchaseAmount)} />
                      <SummaryStat label="Paid" value={currency(vendor.totalPaidAmount)} accent="text-emerald-600" />
                      <SummaryStat label="Due" value={currency(vendor.totalDueAmount)} accent={num(vendor.totalDueAmount) > 0 ? "text-red-600" : "text-emerald-600"} />
                    </div>

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
                              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">No invoices</td></tr>
                            ) : (
                              sortedInvoices.map((inv, idx) => (
                                <tr key={inv.purchaseId || idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{inv.date ? new Date(inv.date).toLocaleDateString("en-IN") : "-"}</td>
                                  <td className="px-4 py-2.5 text-slate-700">{safe(inv.invoiceNo)}</td>
                                  <td className="px-4 py-2.5 text-right text-slate-600">{currency(inv.grandTotal)}</td>
                                  <td className="px-4 py-2.5 text-right text-emerald-600">{currency(inv.amountPaid)}</td>
                                  <td className={`px-4 py-2.5 text-right font-medium ${num(inv.amountDue) > 0 ? "text-red-600" : "text-emerald-600"}`}>{currency(inv.amountDue)}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBg(inv.paymentStatus)} ${statusColor(inv.paymentStatus)}`}>{safe(inv.paymentStatus)}</span>
                                  </td>
                                </tr>
                              ))
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
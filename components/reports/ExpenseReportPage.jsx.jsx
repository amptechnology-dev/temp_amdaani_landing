"use client";

import React, { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import api from "../../utils/api";

/*
  API response shape → /expense/ledger
  {
    summary: { totalPurchaseExpense, totalTaxableValue, totalCGST, totalSGST,
               totalOtherExpense, grandTotalExpense },
    data: [{ _id, date, invoiceNo, purchaseVendor, totalQuantity, rate,
             taxableValue, cgst, sgst, totalExpense }],
    otherExpenses: [
      {
        expenseHead: "Vbj",
        totalAmount: 2000,
        expenses: [{ _id, date, amount, paymentMethod, paidTo, notes }]
      }
    ]
  }
*/

// ── helpers ─────────────────────────────────────────────────────────────
const currency = (v) => `₹${Number(v || 0).toFixed(2)}`;
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : String(v));
const num = (v) => Number(v || 0);

const formatDDMMYY = (dateStr) => {
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

export default function ExpenseReportPage() {
  const [purchaseData, setPurchaseData] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [expandedHeads, setExpandedHeads] = useState({});
  const [storedata, setStoredata] = useState({});

  React.useEffect(() => {
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

  const formattedRange = useMemo(
    () => `${formatShort(startDate)} – ${formatShort(endDate)}`,
    [startDate, endDate]
  );

  const toggleHead = (key) =>
    setExpandedHeads((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── fetch ─────────────────────────────────────────────────────────────
  const fetchReport = useCallback(async (start = startDate, end = endDate) => {
    if (!start || !end) {
      toast.error("Please select both start and end dates.");
      return;
    }
    try {
      setLoading(true);
      const res = await api.get("/expense/ledger", {
        params: {
          startDate: toInputDate(start),
          endDate: toInputDate(end),
        },
      });

      if (res?.success) {
        const d = res.data;
        const rows = Array.isArray(d.data) ? d.data : [];
        const oth = Array.isArray(d.otherExpenses) ? d.otherExpenses : [];
        setPurchaseData(rows);
        setOtherExpenses(oth);
        setSummary(d.summary || null);
        setHasFetched(true);
        if (oth.length > 0) {
          setExpandedHeads({ [oth[0].expenseHead]: true });
        }
      } else {
        toast.error(res?.message || "No records found.");
        setPurchaseData([]);
        setOtherExpenses([]);
        setSummary(null);
      }
    } catch (err) {
      console.error("Fetch error:", err?.message);
      toast.error("Failed to fetch report.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── quick-select ─────────────────────────────────────────────────────
  const applyRange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    fetchReport(start, end);
  };

  const applyThisYear = () => {
    const today = new Date();
    const fy =
      today.getMonth() + 1 >= 4
        ? new Date(today.getFullYear(), 3, 1)
        : new Date(today.getFullYear() - 1, 3, 1);
    applyRange(fy, today);
  };

  const applyThisMonth = () => {
    const today = new Date();
    applyRange(new Date(today.getFullYear(), today.getMonth(), 1), today);
  };

  const applyPreviousMonth = () => {
    const today = new Date();
    applyRange(
      new Date(today.getFullYear(), today.getMonth() - 1, 1),
      new Date(today.getFullYear(), today.getMonth(), 0)
    );
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
    setPurchaseData([]);
    setOtherExpenses([]);
    setSummary(null);
    setHasFetched(false);
  };

  // ── HTML builder for PDF ────────────────────────────────────────────
  const buildHTML = () => {
    const purchaseRows = purchaseData
      .map(
        (r, i) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${i + 1}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${formatDDMMYY(r.date)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(r.purchaseVendor)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(r.invoiceNo)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${num(r.totalQuantity)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(r.rate)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(r.taxableValue)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(r.cgst)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(r.sgst)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;font-weight:700;">${currency(r.totalExpense)}</td>
      </tr>`
      )
      .join("");

    const otherSections = otherExpenses
      .map(
        (group, gi) => `
      <div style="margin-top:${gi === 0 ? 24 : 16}px;">
        <div style="background:#fff3e0;padding:8px 14px;border-radius:8px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
          <b style="font-size:11px;">${safe(group.expenseHead)}</b>
          <span style="font-size:10px;">Total: <b style="color:#e65100;">${currency(group.totalAmount)}</b></span>
        </div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <colgroup>
            <col style="width:5%;"/><col style="width:14%;"/><col style="width:22%;"/>
            <col style="width:26%;"/><col style="width:15%;"/><col style="width:18%;"/>
          </colgroup>
          <thead>
            <tr style="background:#fafafa;">
              <th style="padding:5px 6px;border-bottom:1px solid #ddd;font-size:10px;text-align:center;">#</th>
              <th style="padding:5px 6px;border-bottom:1px solid #ddd;font-size:10px;text-align:left;">Date</th>
              <th style="padding:5px 6px;border-bottom:1px solid #ddd;font-size:10px;text-align:left;">Paid To</th>
              <th style="padding:5px 6px;border-bottom:1px solid #ddd;font-size:10px;text-align:left;">Notes</th>
              <th style="padding:5px 6px;border-bottom:1px solid #ddd;font-size:10px;text-align:left;">Payment</th>
              <th style="padding:5px 6px;border-bottom:1px solid #ddd;font-size:10px;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${group.expenses
              .map(
                (e, i) => `
              <tr>
                <td style="padding:5px 6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${i + 1}</td>
                <td style="padding:5px 6px;border-bottom:1px solid #eee;font-size:10px;">${formatDDMMYY(e.date)}</td>
                <td style="padding:5px 6px;border-bottom:1px solid #eee;font-size:10px;">${safe(e.paidTo)}</td>
                <td style="padding:5px 6px;border-bottom:1px solid #eee;font-size:10px;color:#555;">${safe(e.notes)}</td>
                <td style="padding:5px 6px;border-bottom:1px solid #eee;font-size:10px;">${safe(e.paymentMethod)}</td>
                <td style="padding:5px 6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;font-weight:700;color:#e65100;">${currency(e.amount)}</td>
              </tr>`
              )
              .join("")}
            <tr>
              <td colspan="5" style="padding:6px;text-align:right;font-weight:bold;border-top:1.5px solid #ff9800;font-size:10px;color:#e65100;">Head Total:</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:1.5px solid #ff9800;font-size:11px;color:#e65100;">${currency(group.totalAmount)}</td>
            </tr>
          </tbody>
        </table>
      </div>`
      )
      .join("");

    const grandOtherTotal = otherExpenses.reduce((s, g) => s + num(g.totalAmount), 0);
    const otherBlock = otherExpenses.length
      ? `
      <div style="margin-top:24px;margin-bottom:24px;">
        <h3 style="margin-bottom:8px;">Other Expenses</h3>
        ${otherSections}
        <div style="margin-top:10px;text-align:right;font-weight:bold;font-size:12px;color:#e65100;">
          Grand Other Total: ${currency(grandOtherTotal)}
        </div>
      </div>`
      : "";

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
        <h1>Expense Report</h1>
        <div class="sub">Period: ${formattedRange}</div>
        <div class="chips">
          <div class="chip">Entries: ${purchaseData.length}</div>
          <div class="chip">Taxable: ${currency(summary?.totalTaxableValue)}</div>
          <div class="chip">CGST: ${currency(summary?.totalCGST)}</div>
          <div class="chip">SGST: ${currency(summary?.totalSGST)}</div>
          <div class="chip">Purchase Total: ${currency(summary?.totalPurchaseExpense)}</div>
          <div class="chip">Other Exp: ${currency(summary?.totalOtherExpense)}</div>
          <div class="chip" style="background:#e8f0fe;border-color:#3b5bdb;">
            <b>Grand Total (Purchase + Other): ${currency(summary?.grandTotalExpense)}</b>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f0f4ff;">
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">#</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Date</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Vendor</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Invoice</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Qty</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Rate</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Taxable</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">CGST</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">SGST</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${purchaseRows}
            <tr>
              <td colspan="9" style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">Purchase Total:</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(summary?.totalPurchaseExpense)}</td>
            </tr>
          </tbody>
        </table>
        ${otherBlock}
        <div class="footer">
          <span>AMDAANI — Smart Business Management</span>
          <span>Generated ${new Date().toLocaleString("en-IN")}</span>
        </div>
      </body></html>`;
  };

  const exportPDF = () => {
    if (!purchaseData.length && !otherExpenses.length) {
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
    if (!purchaseData.length && !otherExpenses.length) {
      toast.error("Generate a report first.");
      return;
    }
    try {
      const purchaseSheet = purchaseData.map((r, i) => ({
        "#": i + 1,
        Date: formatDDMMYY(r.date),
        Vendor: safe(r.purchaseVendor),
        Invoice: safe(r.invoiceNo),
        Qty: num(r.totalQuantity),
        Rate: num(r.rate),
        "Taxable Value": num(r.taxableValue),
        CGST: num(r.cgst),
        SGST: num(r.sgst),
        "Total Expense": num(r.totalExpense),
      }));

      const otherSheet = otherExpenses.flatMap((group) =>
        group.expenses.map((e, i) => ({
          "#": i + 1,
          "Expense Head": safe(group.expenseHead),
          Date: formatDDMMYY(e.date),
          "Paid To": safe(e.paidTo),
          Notes: safe(e.notes),
          Payment: safe(e.paymentMethod),
          Amount: num(e.amount),
        }))
      );

      const wb = XLSX.utils.book_new();
      const wsPurchase = XLSX.utils.json_to_sheet(purchaseSheet);
      XLSX.utils.book_append_sheet(wb, wsPurchase, "Purchases");
      if (otherSheet.length) {
        const wsOther = XLSX.utils.json_to_sheet(otherSheet);
        XLSX.utils.book_append_sheet(wb, wsOther, "Other Expenses");
      }

      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Expense_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  const grandOtherTotal = otherExpenses.reduce((s, g) => s + num(g.totalAmount), 0);

  const emptyMessage =
    !startDate || !endDate
      ? "Select a date range and tap Generate."
      : hasFetched
      ? "No records found for the selected period."
      : "Tap Generate to load the report.";

  const hasData = purchaseData.length > 0 || otherExpenses.length > 0;

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
          <h1 className="text-lg font-bold text-slate-900">Expense Report</h1>
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={toInputDate(startDate)}
              max={toInputDate(new Date())}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={toInputDate(endDate)}
              max={toInputDate(new Date())}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <button
            onClick={clearDates}
            disabled={loading || (!startDate && !endDate)}
            title="Clear dates"
            className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CalendarX2 className="w-4 h-4" />
          </button>
        </div>

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
          onClick={() => fetchReport(startDate, endDate)}
          disabled={!startDate || !endDate || loading}
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
          {summary && (
            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 mb-5">
              <div className="text-xs text-slate-400 mb-3">{formattedRange}</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryStat label="Taxable" value={currency(summary.totalTaxableValue)} />
                <SummaryStat label="CGST" value={currency(summary.totalCGST)} accent="text-red-600" />
                <SummaryStat label="SGST" value={currency(summary.totalSGST)} accent="text-red-600" />
                <SummaryStat label="Other Exp" value={currency(summary.totalOtherExpense)} accent="text-red-600" />
                <SummaryStat label="Grand Total" value={currency(summary.grandTotalExpense)} accent="text-blue-600" bold />
              </div>
            </div>
          )}

          {/* Purchase table */}
          {purchaseData.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden mb-5">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Purchase Expenses</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left font-semibold px-4 py-3">Date</th>
                      <th className="text-left font-semibold px-4 py-3">Vendor</th>
                      <th className="text-left font-semibold px-4 py-3">Invoice</th>
                      <th className="text-right font-semibold px-4 py-3">Qty</th>
                      <th className="text-right font-semibold px-4 py-3">Rate</th>
                      <th className="text-right font-semibold px-4 py-3">Taxable</th>
                      <th className="text-right font-semibold px-4 py-3">CGST</th>
                      <th className="text-right font-semibold px-4 py-3">SGST</th>
                      <th className="text-right font-semibold px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseData.map((r, i) => (
                      <tr key={r._id || i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDDMMYY(r.date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{safe(r.purchaseVendor)}</td>
                        <td className="px-4 py-3 text-slate-500">{safe(r.invoiceNo)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{num(r.totalQuantity)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{currency(r.rate)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{currency(r.taxableValue)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{currency(r.cgst)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{currency(r.sgst)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{currency(r.totalExpense)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold text-slate-800">
                      <td colSpan={8} className="px-4 py-3 text-right">Purchase Total:</td>
                      <td className="px-4 py-3 text-right">{currency(summary?.totalPurchaseExpense)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Other expenses — collapsible head groups */}
          {otherExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-slate-800">Other Expenses</h2>
                <span className="text-sm font-bold text-orange-600">{currency(grandOtherTotal)}</span>
              </div>

              {otherExpenses.map((group, gi) => {
                const expanded = !!expandedHeads[group.expenseHead];
                return (
                  <div
                    key={group.expenseHead || gi}
                    className="bg-white border border-orange-200 rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleHead(group.expenseHead)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-orange-50/40 transition-colors"
                    >
                      <div className="text-left">
                        <div className="text-sm font-bold text-slate-800">{group.expenseHead || "Other"}</div>
                        <div className="text-xs text-slate-400">
                          {group.expenses.length} {group.expenses.length !== 1 ? "entries" : "entry"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400">Total</div>
                          <div className="text-base font-bold text-orange-600">{currency(group.totalAmount)}</div>
                        </div>
                        {expanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-slate-100 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                              <th className="text-left font-semibold px-5 py-2.5">Paid To</th>
                              <th className="text-left font-semibold px-5 py-2.5">Date</th>
                              <th className="text-left font-semibold px-5 py-2.5">Payment</th>
                              <th className="text-right font-semibold px-5 py-2.5">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.expenses.map((e, i) => (
                              <tr key={e._id || i}>
                                <td className="px-5 py-3">
                                  <div className="font-medium text-slate-800">{safe(e.paidTo)}</div>
                                  {e.notes ? (
                                    <div className="text-xs text-slate-400 italic">{e.notes}</div>
                                  ) : null}
                                </td>
                                <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDDMMYY(e.date)}</td>
                                <td className="px-5 py-3">
                                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                                    {e.paymentMethod || "—"}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-right font-semibold text-orange-600">
                                  {currency(e.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-orange-50/50">
                              <td colSpan={3} className="px-5 py-3 text-right font-semibold text-orange-700">
                                Head Total:
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-orange-700">
                                {currency(group.totalAmount)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
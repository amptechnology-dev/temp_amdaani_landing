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
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import api from "../../utils/api";

/*
  API response shape → /invoice/profit-loss
  { invoices: [{ _id, invoiceNumber, invoiceDate, customerDescription,
                 totalSales, totalPurchase, profitLoss }] }
*/

// ── helpers ─────────────────────────────────────────────────────────────
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

export default function ProfitLossReportPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
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

  const formattedRange = useMemo(
    () => `${formatShort(startDate)} – ${formatShort(endDate)}`,
    [startDate, endDate]
  );

  // ── fetch ────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async (start = startDate, end = endDate) => {
    if (!start || !end) {
      toast.error("Please select both start and end dates.");
      return;
    }
    try {
      setLoading(true);
      const res = await api.get("/invoice/profit-loss");
      let rows = res?.data?.invoices || [];

      const sDate = new Date(start);
      sDate.setHours(0, 0, 0, 0);
      const eDate = new Date(end);
      eDate.setHours(23, 59, 59, 999);
      rows = rows.filter((rec) => {
        const recDate = new Date(rec.invoiceDate);
        return recDate >= sDate && recDate <= eDate;
      });

      rows = [...rows].sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

      setRecords(rows);
      setHasFetched(true);
      if (!rows.length) {
        toast.error("No records found for the selected period.");
      }
    } catch (e) {
      console.error("Profit Loss fetch error:", e?.message);
      toast.error("Failed to fetch profit-loss report.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // ── quick-select ─────────────────────────────────────────────────────
  const applyRange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    fetchRecords(start, end);
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
    setRecords([]);
    setHasFetched(false);
  };

  // ── totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    return {
      count: records.length,
      totalSales: records.reduce((s, r) => s + num(r.totalSales), 0),
      profitLoss: records.reduce((s, r) => s + num(r.profitLoss), 0),
    };
  }, [records]);

  const hasData = records.length > 0;

  // ── PDF export ───────────────────────────────────────────────────────
  const buildHTML = () => {
    const sorted = [...records].sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));

    const rowsHTML = sorted
      .map(
        (r) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${formatDDMMYY(r.invoiceDate)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(r.invoiceNumber)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(r.customerDescription)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(r.totalSales)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(r.totalPurchase)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;font-weight:700;">${currency(r.profitLoss)}</td>
      </tr>`
      )
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
        <h1>Profit / Loss Report</h1>
        <div class="sub">Period: ${formattedRange}</div>
        <div class="chips">
          <div class="chip">Records: ${totals.count}</div>
          <div class="chip">Total Sales: ${currency(totals.totalSales)}</div>
          <div class="chip" style="background:#e8f0fe;border-color:#3b5bdb;">
            <b>Profit/Loss: ${currency(totals.profitLoss)}</b>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f0f4ff;">
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Date</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Invoice No</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Customer</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Sales Amount</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Purchase Amount</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Profit/Loss</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML || `<tr><td colspan="6" style="padding:12px;text-align:center;">No records</td></tr>`}
            <tr>
              <td colspan="3" style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">TOTAL</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.totalSales)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;"></td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.profitLoss)}</td>
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
      const sorted = [...records].sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));
      const sheet = sorted.map((r) => ({
        Date: formatDDMMYY(r.invoiceDate),
        "Invoice No": safe(r.invoiceNumber),
        Customer: safe(r.customerDescription),
        "Invoice Price": num(r.totalSales),
        "Purchase Amount": num(r.totalPurchase),
        "Profit/Loss": num(r.profitLoss),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sheet);
      ws["!cols"] = Object.keys(sheet[0] || {}).map((k) => ({ wch: Math.max(12, k.length + 2) }));
      XLSX.utils.book_append_sheet(wb, ws, "Profit and Loss");

      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Profit_Loss_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    !startDate || !endDate
      ? "Select a date range and tap Generate."
      : hasFetched
      ? "No records found for the selected period."
      : "Tap Generate to load the report.";

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/40">
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Profit & Loss Report</h1>
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
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                className="h-9 w-[150px] pl-8 pr-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
            </div>
            <span className="text-slate-300 text-xs">–</span>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input type="date" value={toInputDate(endDate)} max={toInputDate(new Date())}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                className="h-9 w-[150px] pl-8 pr-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 shrink-0" />

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

          <button onClick={clearDates} disabled={loading || (!startDate && !endDate)} title="Clear dates"
            className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40">
            <CalendarX2 className="w-4 h-4" />
          </button>

          <button onClick={() => fetchRecords(startDate, endDate)} disabled={!startDate || !endDate || loading}
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
              <div className="grid grid-cols-3 gap-4">
                <SummaryStat label="Count" value={String(totals.count)} />
                <SummaryStat label="Invoice Amount" value={currency(totals.totalSales)} />
                <SummaryStat
                  label="Profit/Loss"
                  value={currency(totals.profitLoss)}
                  accent={totals.profitLoss < 0 ? "text-red-600" : "text-emerald-600"}
                  bold
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Invoice-wise Profit/Loss</h2>
                <span className="text-xs text-slate-400">{totals.count} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left font-semibold px-4 py-3">Date</th>
                      <th className="text-left font-semibold px-4 py-3">Invoice No</th>
                      <th className="text-left font-semibold px-4 py-3">Customer</th>
                      <th className="text-right font-semibold px-4 py-3">Sales Amount</th>
                      <th className="text-right font-semibold px-4 py-3">Purchase Amount</th>
                      <th className="text-right font-semibold px-4 py-3">Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records?.map((r, i) => {
                      const isLoss = num(r.profitLoss) < 0;
                      return (
                        <tr key={`${r._id || r.invoiceNumber || "row"}-${i}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDDMMYY(r.invoiceDate)}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{safe(r.invoiceNumber)}</td>
                          <td className="px-4 py-3 text-slate-700">{safe(r.customerDescription)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{currency(r.totalSales)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{currency(r.totalPurchase)}</td>
                          <td className={`px-4 py-3 text-right font-semibold flex items-center justify-end gap-1 ${
                            isLoss ? "text-red-600" : "text-emerald-600"
                          }`}>
                            {isLoss ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                            {currency(r.profitLoss)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold text-slate-800">
                      <td colSpan={3} className="px-4 py-3 text-right">TOTAL</td>
                      <td className="px-4 py-3 text-right">{currency(totals.totalSales)}</td>
                      <td className="px-4 py-3 text-right"></td>
                      <td className={`px-4 py-3 text-right ${totals.profitLoss < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {currency(totals.profitLoss)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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
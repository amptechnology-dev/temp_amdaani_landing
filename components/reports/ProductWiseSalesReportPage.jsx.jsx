"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Calendar,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  ChevronLeft,
  Package,
} from "lucide-react";
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

const CHUNK_SIZE = 25;

export default function ProductWiseSalesReportPage() {
  // ── Core state ──────────────────────────────────────────────────────────
  const [data, setData] = useState([]); // visible/revealed slice
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [storedata, setStoredata] = useState({});

  const allDataRef = useRef([]);
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

  const formattedRange = useMemo(
    () => `${startDate ? formatDate(startDate) : "All"} - ${endDate ? formatDate(endDate) : "All"}`,
    [startDate, endDate]
  );

  // ── Chunk loading ───────────────────────────────────────────────────────
  const loadNextChunk = useCallback(() => {
    const start = cursorRef.current;
    const end = start + CHUNK_SIZE;
    const nextSlice = allDataRef.current.slice(start, end);
    if (nextSlice.length === 0) return;
    setData((prev) => [...prev, ...nextSlice]);
    cursorRef.current = end;
  }, []);

  const handleLoadMore = () => {
    if (loadingMore) return;
    if (cursorRef.current >= allDataRef.current.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      loadNextChunk();
      setLoadingMore(false);
    }, 0);
  };

  // ── Fetch report ─────────────────────────────────────────────────────────
  const fetchReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates.");
      return;
    }
    try {
      setLoading(true);
      const res = await api.get("/product/sales", {
        params: {
          startDate: toInputDate(startDate),
          endDate: toInputDate(endDate),
        },
      });

      if (res?.success) {
        // Sort by totalSold (highest first)
        const sorted = (res.data || []).sort(
          (a, b) => Number(b.totalSold || 0) - Number(a.totalSold || 0)
        );
        allDataRef.current = sorted;
        cursorRef.current = 0;
        setData([]);
        loadNextChunk();
      } else {
        toast.error(res?.message || "No records found.");
        allDataRef.current = [];
        cursorRef.current = 0;
        setData([]);
      }
    } catch (err) {
      console.error("Fetch error:", err?.message);
      toast.error("Failed to fetch report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // ── Quick range helpers ─────────────────────────────────────────────────
  const applyThisYear = () => {
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
    const today = new Date();
    setStartDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setEndDate(today);
  };
  const applyPreviousMonth = () => {
    const today = new Date();
    setStartDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    setEndDate(new Date(today.getFullYear(), today.getMonth(), 0));
  };
  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

  // ── Totals (over FULL dataset) ─────────────────────────────────────────
  const totals = useMemo(() => {
    const toNum = (v) => Number(v || 0);
    const all = allDataRef.current;
    return {
      count: all.length,
      totalSold: all.reduce((s, r) => s + toNum(r.totalSold), 0),
      totalRevenue: all.reduce((s, r) => s + toNum(r.totalRevenue), 0),
    };
  }, [data]);

  // ── PDF export (browser print → Save as PDF) ───────────────────────────
  const buildHTML = () => {
    const safe = (v) => (v ? String(v) : "-");
    const all = allDataRef.current;

    const rows = all
      .map(
        (p) => `
      <tr>
        <td style="text-align:left;">${safe(p.name)}</td>
        <td style="text-align:left;">${safe(p.hsn)}</td>
        <td style="text-align:center;">${p.totalSold}</td>
        <td style="text-align:center;">${safe(p.unit)}</td>
        <td style="text-align:right;">${currency(p.totalRevenue)}</td>
      </tr>`
      )
      .join("");

    const totalRow = `
      <tr style="font-weight:700; border-top:2px solid #333;">
        <td style="padding:6px; font-size:11px; border:1px solid #ddd;">TOTAL</td>
        <td style="padding:6px; font-size:11px; border:1px solid #ddd;"></td>
        <td style="padding:6px; font-size:11px; border:1px solid #ddd; text-align:center;">${totals.totalSold}</td>
        <td style="padding:6px; font-size:11px; border:1px solid #ddd;"></td>
        <td style="padding:6px; font-size:11px; border:1px solid #ddd; text-align:right;">${currency(totals.totalRevenue)}</td>
      </tr>`;

    return `
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Product Wise Sales Report</title>
        <style>
          @page { size: A4 landscape; margin: 20px; }
          body { font-family: -apple-system, Roboto, "Segoe UI", Arial; color: #111; margin: 0; }
          h1 { font-size: 20px; margin: 0 0 2px; }
          .muted { color: #666; margin-bottom: 16px; }
          .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
          .chip { border-radius: 16px; padding: 6px 12px; background: #f2f2f2; font-size: 12px; color: #333; border: 1px solid #ddd; }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          th, td { border-bottom: 1px solid #eee; padding: 8px 6px; font-size: 11px; word-wrap: break-word; }
          th { background: #fafafa; font-weight: 700; }
          th:nth-child(3), td:nth-child(3) { text-align: center; }
          th:nth-child(4), td:nth-child(4) { text-align: center; }
          th:nth-child(5), td:nth-child(5) { text-align: right; }
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

        <h1>Product Wise Sales Report</h1>
        <div class="muted">Period From: ${formattedRange}</div>

        <div class="chips">
          <div class="chip">Total Products: <b>${totals.count}</b></div>
          <div class="chip">Total Sold: <b>${totals.totalSold}</b></div>
          <div class="chip">Grand Total Revenue: <b>${currency(totals.totalRevenue)}</b></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>HSN</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="5" style="text-align:center;">No records</td></tr>`}${totalRow}</tbody>
        </table>

        <div class="footer">
          <span>AMDAANI — Smart Business Management</span>
          <span>Generated: ${new Date().toLocaleString("en-IN")}</span>
        </div>
      </body>
      </html>`;
  };

  const exportPDF = () => {
    if (!allDataRef.current.length) {
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
    if (!allDataRef.current.length) {
      toast.error("No records to export.");
      return;
    }
    try {
      const sheetData = allDataRef.current.map((p) => ({
        Product: p.name,
        HSN: p.hsn,
        Quantity: p.totalSold,
        Unit: p.unit,
        Revenue: p.totalRevenue,
      }));

      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws["!cols"] = Object.keys(sheetData[0]).map((key) => ({ wch: Math.max(12, key.length + 2) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Product Sales");
      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });

      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ProductWiseSales_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  const hasMore = cursorRef.current < allDataRef.current.length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/40">
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Product Wise Sales</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportPDF} disabled={!data.length || loading} className="h-9 px-3 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium">
              <FileText className="w-4 h-4" />PDF
            </button>
            <button onClick={exportExcel} disabled={!data.length || loading} className="h-9 px-3 rounded-lg border border-slate-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium">
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
            <button onClick={applyThisYear} className="h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">
              This Year
            </button>
            <button onClick={applyThisMonth} className="h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">
              This Month
            </button>
            <button onClick={applyPreviousMonth} className="h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">
              Prev Month
            </button>
          </div>

          <button onClick={fetchReport} disabled={!startDate || !endDate || loading}
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
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm text-center">
            No records found. Select date range and Generate.
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3.5 mb-4">
              <div className="text-xs text-slate-400 mb-2">{formattedRange}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <SummaryStat label="Products" value={String(totals.count)} />
                <SummaryStat label="Total Sold" value={String(totals.totalSold)} />
                <SummaryStat label="Grand Total" value={currency(totals.totalRevenue)} accent="text-blue-600" bold />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left font-semibold px-4 py-3">Product</th>
                      <th className="text-left font-semibold px-4 py-3">HSN</th>
                      <th className="text-right font-semibold px-4 py-3">Price</th>
                      <th className="text-center font-semibold px-4 py-3">Qty Sold</th>
                      <th className="text-left font-semibold px-4 py-3">Unit</th>
                      <th className="text-right font-semibold px-4 py-3">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((p, idx) => (
                      <tr key={p._id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-700 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                          </span>
                          {p.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.hsn || "-"}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{currency(p.sellingPrice)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                            {p.totalSold}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.unit || "-"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {currency(p.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
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
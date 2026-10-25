"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  Package,
  Receipt,
} from "lucide-react";
import api from "../../utils/api";

/*
  API response shape → /invoice/profit-loss
  {
    summary: { totalSales, totalPurchase, totalProfit },
    products: [{ productId, productName, quantitySold, invoiceCount,
                 totalSales, totalPurchase, profitLoss, marginPercent }],
    invoices: [{ _id, invoiceNumber, invoiceDate, customerDescription,
                 totalSales, totalPurchase, profitLoss }]
  }
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

// Local date → "YYYY-MM-DD" (toISOString UTC shift avoid korar jonno)
const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fromInputDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const VIEW = { INVOICE: "invoice", PRODUCT: "product" };

export default function ProfitLossReportPage() {
  const [records, setRecords] = useState([]);
  const [productRows, setProductRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [storedata, setStoredata] = useState({});

  const [view, setView] = useState(VIEW.INVOICE);
  const [productList, setProductList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");

  // Latest request-er id (purono request-er response ignore korar jonno)
  const requestIdRef = useRef(0);

  // store info (PDF header)
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

  // product list (filter dropdown) — ItemsPage-er same /product API
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/product", { params: { page: 1, limit: 500 } });
        const docs = res?.data?.docs ?? [];
        setProductList(
          [...docs].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
        );
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

  const selectedProductName = useMemo(
    () => productList.find((p) => p._id === selectedProduct)?.name || "",
    [productList, selectedProduct]
  );

  // ── fetch ────────────────────────────────────────────────────────────
  const fetchRecords = useCallback(
    async (start = startDate, end = endDate, productId = selectedProduct) => {
      if (!start || !end) {
        toast.error("Please select both start and end dates.");
        return;
      }

      const myRequestId = ++requestIdRef.current;

      try {
        setLoading(true);

        const s = new Date(start);
        s.setHours(0, 0, 0, 0);
        const e = new Date(end);
        e.setHours(23, 59, 59, 999);

        // Timestamp (number) pathai: timezone-safe, backend-e parse problem hoy na
        const params = {
          startDate: s.getTime(),
          endDate: e.getTime(),
        };
        if (productId) params.productId = productId;

        const res = await api.get("/invoice/profit-loss", {
          params,
          timeout: 120000,
        });

        // Notun request shuru hoye gele purono response ignore koro
        if (myRequestId !== requestIdRef.current) return;

        const payload = res?.data ?? {};
        let rows = payload.invoices || [];
        rows = [...rows].sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

        setRecords(rows);
        setProductRows(payload.products || []);
        setHasFetched(true);
        if (!rows.length) {
          toast.error("No records found for the selected filters.");
        }
      } catch (err) {
        if (myRequestId !== requestIdRef.current) return;
        console.error("Profit Loss fetch error:", err?.code, err?.message);
        toast.error("Failed to fetch profit-loss report.");
        setRecords([]);
        setProductRows([]);
      } finally {
        if (myRequestId === requestIdRef.current) setLoading(false);
      }
    },
    [startDate, endDate, selectedProduct]
  );

  // product filter change hole (date select kora thakle) auto refetch
  useEffect(() => {
    if (hasFetched && startDate && endDate) {
      fetchRecords(startDate, endDate, selectedProduct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

  // ── quick-select ─────────────────────────────────────────────────────
  const applyRange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    fetchRecords(start, end, selectedProduct);
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

  const clearAll = () => {
    requestIdRef.current++;
    setLoading(false);
    setStartDate(null);
    setEndDate(null);
    setSelectedProduct("");
    setRecords([]);
    setProductRows([]);
    setHasFetched(false);
  };

  // ── totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    return {
      count: records.length,
      productCount: productRows.length,
      totalSales: records.reduce((s, r) => s + num(r.totalSales), 0),
      totalPurchase: records.reduce((s, r) => s + num(r.totalPurchase), 0),
      profitLoss: records.reduce((s, r) => s + num(r.profitLoss), 0),
      quantitySold: productRows.reduce((s, p) => s + num(p.quantitySold), 0),
    };
  }, [records, productRows]);

  const hasData = records.length > 0;

  // ── PDF export ───────────────────────────────────────────────────────
  const buildHTML = () => {
    const filterLine = selectedProductName ? `Product: ${selectedProductName}` : "All Products";
    let tableHTML = "";

    if (view === VIEW.PRODUCT) {
      const rowsHTML = productRows
        .map(
          (p) => `
        <tr>
          <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(p.productName)}</td>
          <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${num(p.quantitySold)}</td>
          <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(p.totalSales)}</td>
          <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(p.totalPurchase)}</td>
          <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;font-weight:700;color:${num(p.profitLoss) < 0 ? "#c62828" : "#2e7d32"};">${currency(p.profitLoss)}</td>
          <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${num(p.marginPercent).toFixed(2)}%</td>
        </tr>`
        )
        .join("");

      tableHTML = `
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f0f4ff;">
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Product</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Qty Sold</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Sales Amount</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Purchase Amount</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Profit/Loss</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Margin %</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML || `<tr><td colspan="6" style="padding:12px;text-align:center;">No records</td></tr>`}
            <tr>
              <td style="padding:6px;font-weight:bold;border-top:2px solid #333;">TOTAL</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${totals.quantitySold}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.totalSales)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.totalPurchase)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.profitLoss)}</td>
              <td style="padding:6px;border-top:2px solid #333;"></td>
            </tr>
          </tbody>
        </table>`;
    } else {
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

      tableHTML = `
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
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.totalPurchase)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.profitLoss)}</td>
            </tr>
          </tbody>
        </table>`;
    }

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
        <h1>Profit / Loss Report (${view === VIEW.PRODUCT ? "Product-wise" : "Invoice-wise"})</h1>
        <div class="sub">Period: ${formattedRange} &nbsp;|&nbsp; ${filterLine}</div>
        <div class="chips">
          <div class="chip">Invoices: ${totals.count}</div>
          <div class="chip">Total Sales: ${currency(totals.totalSales)}</div>
          <div class="chip">Total Purchase: ${currency(totals.totalPurchase)}</div>
          <div class="chip" style="background:#e8f0fe;border-color:#3b5bdb;">
            <b>Profit/Loss: ${currency(totals.profitLoss)}</b>
          </div>
        </div>
        ${tableHTML}
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

      const sorted = [...records].sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));
      const invoiceSheet = sorted.map((r) => ({
        Date: formatDDMMYY(r.invoiceDate),
        "Invoice No": safe(r.invoiceNumber),
        Customer: safe(r.customerDescription),
        "Sales Amount": num(r.totalSales),
        "Purchase Amount": num(r.totalPurchase),
        "Profit/Loss": num(r.profitLoss),
      }));

      const productSheet = productRows.map((p) => ({
        Product: safe(p.productName),
        "Qty Sold": num(p.quantitySold),
        Invoices: num(p.invoiceCount),
        "Sales Amount": num(p.totalSales),
        "Purchase Amount": num(p.totalPurchase),
        "Profit/Loss": num(p.profitLoss),
        "Margin %": num(p.marginPercent),
      }));

      const wsProduct = XLSX.utils.json_to_sheet(productSheet);
      wsProduct["!cols"] = Object.keys(productSheet[0] || {}).map((k) => ({ wch: Math.max(14, k.length + 2) }));

      const wsInvoice = XLSX.utils.json_to_sheet(invoiceSheet);
      wsInvoice["!cols"] = Object.keys(invoiceSheet[0] || {}).map((k) => ({ wch: Math.max(14, k.length + 2) }));

      // Active view age thakbe
      if (view === VIEW.PRODUCT) {
        XLSX.utils.book_append_sheet(wb, wsProduct, "Product-wise");
        XLSX.utils.book_append_sheet(wb, wsInvoice, "Invoice-wise");
      } else {
        XLSX.utils.book_append_sheet(wb, wsInvoice, "Invoice-wise");
        XLSX.utils.book_append_sheet(wb, wsProduct, "Product-wise");
      }

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
      ? "No records found for the selected filters."
      : "Tap Generate to load the report.";

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/40">
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.history.back()}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Profit & Loss Report</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportPDF}
              disabled={!hasData || loading}
              className="h-9 px-3 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />PDF
            </button>
            <button
              onClick={exportExcel}
              disabled={!hasData || loading}
              className="h-9 px-3 rounded-lg border border-slate-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium"
            >
              <FileSpreadsheet className="w-4 h-4" />Excel
            </button>
          </div>
        </div>

        {/* Filter toolbar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={toInputDate(startDate)}
                max={toInputDate(new Date())}
                onChange={(e) => setStartDate(fromInputDate(e.target.value))}
                className="h-9 w-[150px] pl-8 pr-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <span className="text-slate-300 text-xs">–</span>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={toInputDate(endDate)}
                max={toInputDate(new Date())}
                onChange={(e) => setEndDate(fromInputDate(e.target.value))}
                className="h-9 w-[150px] pl-8 pr-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { label: "This Year", fn: applyThisYear },
              { label: "This Month", fn: applyThisMonth },
              { label: "Prev Month", fn: applyPreviousMonth },
            ].map(({ label, fn }) => (
              <button
                key={label}
                onClick={fn}
                disabled={loading}
                className="h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Product filter */}
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            disabled={loading}
            className="h-9 max-w-[200px] px-3 rounded-lg border border-slate-200 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 capitalize"
          >
            <option value="">All Products</option>
            {productList.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={clearAll}
            disabled={!startDate && !endDate && !selectedProduct}
            title="Clear filters"
            className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <CalendarX2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => fetchRecords(startDate, endDate, selectedProduct)}
            disabled={!startDate || !endDate || loading}
            className="h-9 px-4 ml-auto shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[13px] font-semibold flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Generate"}
          </button>
        </div>
      </div>

      {/* CONTENT */}
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
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-400">
                  {formattedRange}
                  {selectedProductName && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold capitalize">
                      {selectedProductName}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryStat label="Invoices" value={String(totals.count)} />
                <SummaryStat label="Products" value={String(totals.productCount)} />
                <SummaryStat label="Sales Amount" value={currency(totals.totalSales)} />
                <SummaryStat label="Purchase Amount" value={currency(totals.totalPurchase)} />
                <SummaryStat
                  label="Profit/Loss"
                  value={currency(totals.profitLoss)}
                  accent={totals.profitLoss < 0 ? "text-red-600" : "text-emerald-600"}
                  bold
                />
              </div>
            </div>

            {/* View toggle */}
            <div className="inline-flex items-center gap-1 p-1 mb-3 bg-white border border-slate-200/80 rounded-xl">
              <button
                onClick={() => setView(VIEW.INVOICE)}
                className={`h-8 px-3 rounded-lg text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors ${
                  view === VIEW.INVOICE ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Invoice-wise
              </button>
              <button
                onClick={() => setView(VIEW.PRODUCT)}
                className={`h-8 px-3 rounded-lg text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors ${
                  view === VIEW.PRODUCT ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Product-wise
              </button>
            </div>

            {/* Product-wise table */}
            {view === VIEW.PRODUCT && (
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden mb-4">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800">Product-wise Profit/Loss</h2>
                  <span className="text-xs text-slate-400">{productRows.length} products</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left font-semibold px-4 py-3">Product</th>
                        <th className="text-right font-semibold px-4 py-3">Qty Sold</th>
                        <th className="text-right font-semibold px-4 py-3">Invoices</th>
                        <th className="text-right font-semibold px-4 py-3">Sales Amount</th>
                        <th className="text-right font-semibold px-4 py-3">Purchase Amount</th>
                        <th className="text-right font-semibold px-4 py-3">Profit/Loss</th>
                        <th className="text-right font-semibold px-4 py-3">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productRows.map((p, i) => {
                        const isLoss = num(p.profitLoss) < 0;
                        return (
                          <tr
                            key={`${p.productId || p.productName}-${i}`}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-slate-800 capitalize">
                              {safe(p.productName)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">{num(p.quantitySold)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{num(p.invoiceCount)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{currency(p.totalSales)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{currency(p.totalPurchase)}</td>
                            <td
                              className={`px-4 py-3 text-right font-semibold ${
                                isLoss ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              <span className="inline-flex items-center justify-end gap-1">
                                {isLoss ? (
                                  <TrendingDown className="w-3.5 h-3.5" />
                                ) : (
                                  <TrendingUp className="w-3.5 h-3.5" />
                                )}
                                {currency(p.profitLoss)}
                              </span>
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-medium ${
                                isLoss ? "text-red-600" : "text-slate-600"
                              }`}
                            >
                              {num(p.marginPercent).toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-semibold text-slate-800">
                        <td className="px-4 py-3 text-right">TOTAL</td>
                        <td className="px-4 py-3 text-right">{totals.quantitySold}</td>
                        <td className="px-4 py-3 text-right"></td>
                        <td className="px-4 py-3 text-right">{currency(totals.totalSales)}</td>
                        <td className="px-4 py-3 text-right">{currency(totals.totalPurchase)}</td>
                        <td
                          className={`px-4 py-3 text-right ${
                            totals.profitLoss < 0 ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {currency(totals.profitLoss)}
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Invoice-wise table */}
            {view === VIEW.INVOICE && (
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
                      {records.map((r, i) => {
                        const isLoss = num(r.profitLoss) < 0;
                        return (
                          <tr
                            key={`${r._id || r.invoiceNumber || "row"}-${i}`}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                              {formatDDMMYY(r.invoiceDate)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{safe(r.invoiceNumber)}</td>
                            <td className="px-4 py-3 text-slate-700">{safe(r.customerDescription)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{currency(r.totalSales)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{currency(r.totalPurchase)}</td>
                            <td
                              className={`px-4 py-3 text-right font-semibold ${
                                isLoss ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              <span className="inline-flex items-center justify-end gap-1">
                                {isLoss ? (
                                  <TrendingDown className="w-3.5 h-3.5" />
                                ) : (
                                  <TrendingUp className="w-3.5 h-3.5" />
                                )}
                                {currency(r.profitLoss)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-semibold text-slate-800">
                        <td colSpan={3} className="px-4 py-3 text-right">TOTAL</td>
                        <td className="px-4 py-3 text-right">{currency(totals.totalSales)}</td>
                        <td className="px-4 py-3 text-right">{currency(totals.totalPurchase)}</td>
                        <td
                          className={`px-4 py-3 text-right ${
                            totals.profitLoss < 0 ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {currency(totals.profitLoss)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
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
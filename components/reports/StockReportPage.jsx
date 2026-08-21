"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Search,
  X,
  CalendarX2,
  RefreshCw,
  ChevronLeft,
  ChevronDown,
  Check,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import api from "../../utils/api";

/*
  API response shape (per record) → /invoice/stock-report
  {
    openingQty, purchaseQty, returnInQty, saleQty, returnOutQty,
    damageQty, expiredQty, closingStock, currentStockValue,
    avgStockValue, adjustmentQty, itemDescription,
    lastPurchaseRate, avgPurchaseRate
  }
*/

// ── transaction type config ─────────────────────────────────────────────
const AS_ON_DATE_TYPES = new Set([
  "DAMAGE",
  "SALE",
  "SALE_RETURN",
  "PURCHASE_RETURN",
  "PURCHASE_REVERSE",
  "STOCK_REDUCE",
  "RETURN_TO_VENDOR",
  "TRANSFER",
]);

const TRANSACTION_TYPES = [
  { key: null, label: "All", icon: "📦" },
  { key: "DAMAGE", label: "Damage", icon: "🔴" },
  { key: "PURCHASE_RETURN", label: "Purch. Return", icon: "↩️" },
  { key: "SALE_RETURN", label: "Sale Return", icon: "↪️" },
  { key: "EXPIRED", label: "Expired", icon: "📅" },
];

// ── helpers ──────────────────────────────────────────────────────────────
const totalIn = (r) =>
  (r.purchaseQty || 0) +
  (r.returnInQty || 0) +
  (r.saleReturnQty || 0) +
  (r.adjustmentInQty || 0);

const totalOut = (r) =>
  (r.saleQty || 0) +
  (r.returnOutQty || 0) +
  (r.damageQty || 0) +
  (r.expiredQty || 0) +
  (r.purchaseReturnQty || 0) +
  (r.purchaseReverseQty || 0) +
  (r.stockReduceQty || 0) +
  (r.returnToVendorQty || 0) +
  (r.transferQty || 0) +
  (r.adjustmentOutQty || 0);

const safe = (v) => (v === undefined || v === null || v === "" ? "-" : String(v));
const num = (v) => parseFloat(Number(v || 0).toFixed(2));
const fmt = (v) =>
  num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const currentFinancialYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  const startYear = today.getMonth() + 1 >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

const generateLocalFYOptions = () => {
  const today = new Date();
  const year = today.getFullYear();
  const start = today.getMonth() + 1 >= 4 ? year : year - 1;
  const opts = [];
  for (let i = 0; i < 8; i++) {
    const sy = start - i;
    opts.push(`${sy}-${String(sy + 1).slice(-2)}`);
  }
  return opts;
};

const fetchStockData = async (financialYear, txType, itemName) => {
  const params = {};
  if (financialYear) params.financialYear = financialYear;
  if (txType) params.transactionType = txType;
  if (itemName) params.itemName = itemName;
  return api.get("/invoice/stock-report", { params });
};

export default function StockReportPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [financialYear, setFinancialYear] = useState(currentFinancialYear());
  const [activeType, setActiveType] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [fyOpen, setFyOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const [fyOptions, setFyOptions] = useState([]);
  const [fyLoading, setFyLoading] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const searchDebounceRef = useRef(null);
  const searchBoxRef = useRef(null);
  const toolbarRef = useRef(null);

  const [storedata, setStoredata] = useState({});

  // full dataset lives in a ref (not state) so totals/exports always use everything
  const allRecordsRef = useRef([]);

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

  // ── fetch financial years ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setFyLoading(true);
        const res = await api.get("/store/financial-years");
        const list = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
        const years = list.map((item) => item.financialYear ?? item).filter(Boolean);
        if (years.length > 0) {
          setFyOptions(years);
          const current = currentFinancialYear();
          setFinancialYear(years.includes(current) ? current : years[0]);
        } else {
          setFyOptions(generateLocalFYOptions());
        }
      } catch (e) {
        console.error("Financial year fetch error:", e?.message);
        setFyOptions(generateLocalFYOptions());
      } finally {
        setFyLoading(false);
      }
    })();
  }, []);

  // close dropdowns / suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        setFyOpen(false);
        setTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── core fetch ───────────────────────────────────────────────────────────
  const runFetch = useCallback(async (fy, txType, itemName) => {
    if (!fy) {
      toast.error("Please select a financial year.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetchStockData(fy, txType, itemName);
      const rows = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
      allRecordsRef.current = rows;
      setRecords(rows);
      setHasFetched(true);
      if (!rows.length) {
        toast.error("No stock records found for this filter.");
      }
    } catch (e) {
      console.error("Stock report fetch error:", e?.message);
      toast.error("Failed to fetch stock report.");
      allRecordsRef.current = [];
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── suggestions (debounced) ────────────────────────────────────────────
  const fetchSuggestions = async (query) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      setSuggestionsLoading(true);
      const res = await api.get("/product/suggestions", { params: { search: query } });
      const list = Array.isArray(res?.data)
        ? res.data
        : res?.data?.data || res?.data?.suggestions || [];
      setSuggestions(list);
      setShowSuggestions(list.length > 0);
    } catch (e) {
      console.error("Suggestion fetch error:", e?.message);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setProductSearch(text);
    setSelectedProduct(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  };

  const handleSelectSuggestion = (item) => {
    const name = item.name || item.itemDescription || item.productName || "";
    setProductSearch(name);
    setSelectedProduct(item);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const clearAll = () => {
    const current = currentFinancialYear();
    setFinancialYear(fyOptions.includes(current) ? current : fyOptions[0] || current);
    setActiveType(null);
    setProductSearch("");
    setSelectedProduct(null);
    setSuggestions([]);
    setShowSuggestions(false);
    allRecordsRef.current = [];
    setRecords([]);
    setHasFetched(false);
  };

  const handleTypeSelect = (type) => {
    setActiveType(type);
    setTypeOpen(false);
    runFetch(financialYear, type, productSearch);
  };

  const handleGenerate = () => runFetch(financialYear, activeType, productSearch);

  // ── derived ──────────────────────────────────────────────────────────────
  const formattedRange = `FY ${financialYear}`;
  const isAsOnDate = activeType && AS_ON_DATE_TYPES.has(activeType);
  const activeTypeMeta = TRANSACTION_TYPES.find((t) => t.key === activeType);

  const totals = useMemo(() => {
    const all = allRecordsRef.current;
    const sum = (fn) => parseFloat(all.reduce((s, r) => s + fn(r), 0).toFixed(2));
    return {
      count: all.length,
      openingQty: sum((r) => num(r.openingQty)),
      purchaseQty: sum((r) => num(r.purchaseQty)),
      returnInQty: sum((r) => num(r.returnInQty)),
      saleQty: sum((r) => num(r.saleQty)),
      returnOutQty: sum((r) => num(r.returnOutQty)),
      damageQty: sum((r) => num(r.damageQty)),
      expiredQty: sum((r) => num(r.expiredQty)),
      adjustmentQty: sum((r) => num(r.adjustmentQty)),
      closingStock: sum((r) => num(r.closingStock)),
      stockValue: sum((r) => num(r.currentStockValue)),
      averageStockValue: sum((r) => num(r.avgStockValue)),
      totalIn: sum((r) => totalIn(r)),
      totalOut: sum((r) => totalOut(r)),
    };
  }, [records]);

  const hasData = records.length > 0;

  // ── PDF export ───────────────────────────────────────────────────────────
  const buildHTML = () => {
    const txLabel = activeTypeMeta?.label || "All";
    const allRecords = allRecordsRef.current;

    const bodyRows = allRecords
      .map(
        (r, i) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${i + 1}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(r.itemDescription)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${num(r.openingQty)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${num(r.purchaseQty)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${num(r.returnInQty)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${num(r.saleQty)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${num(r.returnOutQty)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${num(r.damageQty)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${num(r.expiredQty)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${num(r.adjustmentQty)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:center;">${num(r.closingStock)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${fmt(r.currentStockValue)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${fmt(r.avgStockValue)}</td>
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
        <h1>Stock Report</h1>
        <div class="sub">Period: ${formattedRange} · Type: ${txLabel}</div>
        <div class="chips">
          <div class="chip">Items: ${totals.count}</div>
          <div class="chip">Stock Value: ${fmt(totals.stockValue)}</div>
          <div class="chip">Closing Stock: ${fmt(totals.closingStock)}</div>
          <div class="chip">Total In: ${fmt(totals.totalIn)}</div>
          <div class="chip">Total Out: ${fmt(totals.totalOut)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f0f4ff;">
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">#</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Item</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Opening(+)</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Purchase(+)</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Sale Ret.(+)</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Sale(-)</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Purch.Ret.(-)</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Damage(-)</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Expired(-)</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Adjustment(+-)</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:center;">Closing</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Stock Value</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Avg Value</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows || `<tr><td colspan="13" style="padding:12px;text-align:center;">No records</td></tr>`}
            <tr>
              <td colspan="2" style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">TOTAL</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${fmt(totals.openingQty)}</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${fmt(totals.purchaseQty)}</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${fmt(totals.returnInQty)}</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${fmt(totals.saleQty)}</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${fmt(totals.returnOutQty)}</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${fmt(totals.damageQty)}</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${fmt(totals.expiredQty)}</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${fmt(totals.adjustmentQty)}</td>
              <td style="padding:6px;text-align:center;font-weight:bold;border-top:2px solid #333;">${fmt(totals.closingStock)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${fmt(totals.stockValue)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${fmt(totals.averageStockValue)}</td>
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

  // ── Excel export ───────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!hasData) {
      toast.error("Generate a report first.");
      return;
    }
    try {
      const allRecords = allRecordsRef.current;
      const data = allRecords.map((r, i) => ({
        "SL no": i + 1,
        Item: safe(r.itemDescription),
        "Opening Stock": num(r.openingQty),
        Purchase: num(r.purchaseQty),
        "Purchase Return": num(r.returnInQty),
        Sale: num(r.saleQty),
        "Sales Return": num(r.returnOutQty),
        Damage: num(r.damageQty),
        Expired: num(r.expiredQty),
        Adjustment: num(r.adjustmentQty),
        "Closing Stock": num(r.closingStock),
        "Current Stock Value": num(r.currentStockValue),
        "Average Stock Value": num(r.avgStockValue),
      }));
      data.push({
        "SL no": "",
        Item: `TOTAL (${totals.count} items)`,
        "Opening Stock": totals.openingQty,
        Purchase: totals.purchaseQty,
        "Purchase Return": totals.returnInQty,
        Sale: totals.saleQty,
        "Sales Return": totals.returnOutQty,
        Damage: totals.damageQty,
        Expired: totals.expiredQty,
        Adjustment: totals.adjustmentQty,
        "Closing Stock": totals.closingStock,
        "Current Stock Value": totals.stockValue,
        "Average Stock Value": totals.averageStockValue,
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = Object.keys(data[0]).map((k) => ({ wch: Math.max(14, k.length + 2) }));
      XLSX.utils.book_append_sheet(wb, ws, "Stock Report");

      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Stock_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  const emptyMessage = !financialYear
    ? "Select a financial year and tap Generate."
    : hasFetched
    ? `No stock records found for ${formattedRange}.`
    : "Tap Generate to load the report.";

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/40">
      <div className="px-4 md:px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Stock Report</h1>
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center gap-2 flex-wrap" ref={toolbarRef}>
          {/* FY dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => { setFyOpen((v) => !v); setTypeOpen(false); }}
              disabled={fyLoading || loading}
              className="h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{fyLoading ? "Loading…" : financialYear || "Select FY"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {fyOpen && !fyLoading && (
              <div className="absolute z-20 mt-1 left-0 w-[140px] bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {fyOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-400">No financial years found</div>
                ) : (
                  fyOptions.map((fy) => (
                    <button
                      key={fy}
                      onClick={() => { setFinancialYear(fy); setFyOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                        fy === financialYear ? "text-emerald-600 font-semibold" : "text-slate-700"
                      }`}
                    >
                      {fy}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 shrink-0" />

          {/* Product search */}
          <div className="relative shrink-0" ref={searchBoxRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search product (Pen, Medicine...)"
              value={productSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className={`h-9 w-[220px] pl-8 pr-8 rounded-lg border text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
                selectedProduct ? "border-emerald-400 text-emerald-700" : "border-slate-200 text-slate-700"
              }`}
            />
            {productSearch && (
              <button
                onClick={() => { setProductSearch(""); setSelectedProduct(null); setSuggestions([]); setShowSuggestions(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-[280px] bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {suggestions.map((item, idx) => {
                  const label = item.name || item.itemDescription || item.productName || "";
                  return (
                    <button
                      key={item._id || item.id || idx}
                      onClick={() => handleSelectSuggestion(item)}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 ${
                        idx < suggestions.length - 1 ? "border-b border-slate-100" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-800 truncate">{label}</span>
                        {item.currentStock !== undefined && (
                          <span className="text-xs text-slate-400 ml-2 shrink-0">Stock: {fmt(item.currentStock)}</span>
                        )}
                      </div>
                      {(item.hsn || item.category) && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {[item.hsn && `HSN: ${item.hsn}`, item.category].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transaction type dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => { setTypeOpen((v) => !v); setFyOpen(false); }}
              disabled={loading}
              className={`h-9 px-3 rounded-lg border text-[12.5px] font-medium flex items-center gap-1.5 disabled:opacity-50 ${
                activeType != null ? "bg-blue-50 border-blue-200 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{activeTypeMeta?.icon} {activeTypeMeta?.label || "All Types"}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {typeOpen && (
              <div className="absolute z-20 mt-1 left-0 w-[180px] bg-white border border-slate-200 rounded-xl shadow-lg p-1.5">
                {TRANSACTION_TYPES.map(({ key, label, icon }) => (
                  <button
                    key={String(key)}
                    onClick={() => handleTypeSelect(key)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm flex items-center justify-between ${
                      activeType === key ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{icon} {label}</span>
                    {activeType === key && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={clearAll} disabled={loading || fyLoading} title="Reset filters"
            className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40">
            <CalendarX2 className="w-4 h-4" />
          </button>

          <button onClick={handleGenerate} disabled={!financialYear || loading || fyLoading}
            className="h-9 px-4 ml-auto shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[13px] font-semibold flex items-center gap-2 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Generate"}
          </button>
        </div>

        {isAsOnDate && (
          <div className="text-[11px] text-slate-400 italic mt-1.5 px-1">
            ℹ️ Using End Date as "As On Date" for this filter
          </div>
        )}
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
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-400">
                  {formattedRange}
                  {selectedProduct ? ` · ${productSearch}` : ""}
                </div>
                {activeType && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                    {activeTypeMeta?.icon} {activeTypeMeta?.label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryStat label="Items" value={String(totals.count)} />
                <SummaryStat label="Stock Value" value={fmt(totals.stockValue)} bold />
                <SummaryStat label="Closing Stock" value={fmt(totals.closingStock)} />
                <SummaryStat label="Total In" value={fmt(totals.totalIn)} accent="text-emerald-600" />
                <SummaryStat label="Total Out" value={fmt(totals.totalOut)} accent="text-red-600" />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Stock Movement</h2>
                <span className="text-xs text-slate-400">{totals.count} items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left font-semibold px-4 py-3">Item</th>
                      <th className="text-right font-semibold px-4 py-3">Opening(+)</th>
                      <th className="text-right font-semibold px-4 py-3">Purchase(+)</th>
                      <th className="text-right font-semibold px-4 py-3">Sale Ret.(+)</th>
                      <th className="text-right font-semibold px-4 py-3">Sale(-)</th>
                      <th className="text-right font-semibold px-4 py-3">Purch.Ret.(-)</th>
                      <th className="text-right font-semibold px-4 py-3">Damage(-)</th>
                      <th className="text-right font-semibold px-4 py-3">Expired(-)</th>
                      <th className="text-right font-semibold px-4 py-3">Adj.(+-)</th>
                      <th className="text-right font-semibold px-4 py-3">Closing</th>
                      <th className="text-right font-semibold px-4 py-3">Stock Value</th>
                      <th className="text-right font-semibold px-4 py-3">Avg Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records?.map((r, i) => (
                      <tr key={`${r._id || r.id || "row"}-${i}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{safe(r.itemDescription)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{num(r.openingQty)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{num(r.purchaseQty)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{num(r.returnInQty)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{num(r.saleQty)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{num(r.returnOutQty)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{num(r.damageQty)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{num(r.expiredQty)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{num(r.adjustmentQty)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{num(r.closingStock)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600">{fmt(r.currentStockValue)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(r.avgStockValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold text-slate-800">
                      <td className="px-4 py-3 text-right">TOTAL</td>
                      <td className="px-4 py-3 text-right">{fmt(totals.openingQty)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{fmt(totals.purchaseQty)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{fmt(totals.returnInQty)}</td>
                      <td className="px-4 py-3 text-right text-red-700">{fmt(totals.saleQty)}</td>
                      <td className="px-4 py-3 text-right text-red-700">{fmt(totals.returnOutQty)}</td>
                      <td className="px-4 py-3 text-right text-red-700">{fmt(totals.damageQty)}</td>
                      <td className="px-4 py-3 text-right text-red-700">{fmt(totals.expiredQty)}</td>
                      <td className="px-4 py-3 text-right">{fmt(totals.adjustmentQty)}</td>
                      <td className="px-4 py-3 text-right">{fmt(totals.closingStock)}</td>
                      <td className="px-4 py-3 text-right text-blue-700">{fmt(totals.stockValue)}</td>
                      <td className="px-4 py-3 text-right">{fmt(totals.averageStockValue)}</td>
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
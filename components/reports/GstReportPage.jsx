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
} from "lucide-react";
import api from "../../utils/api";

/*
  API response shape → /invoice/gst-sales-report  or  /invoice/gst-purchase
  {
    success: true,
    data: [
      {
        _id, invoiceNumber / billNumber, invoiceDate / purchaseDate,
        customerName / vendorName, customerGst / vendorGst,
        item, unit, quantity, hsn,
        taxableValue, cgstAmount, sgstAmount, cgstPercent, sgstPercent,
        invoiceAmount / billAmount
      }
    ]
  }
*/

// ── helpers ─────────────────────────────────────────────────────────────
const currency = (v) => `₹${Number(v || 0).toFixed(2)}`;
const safe = (v) =>
  v === undefined || v === null || v === "" ? "-" : String(v);
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

// Normalizes a row regardless of sales/purchase shape
const getRow = (item, gstType) => {
  const isSales = gstType === "sales";
  return {
    id: item._id,
    invoiceNo: isSales ? item.invoiceNumber : item.billNumber,
    date: isSales ? item.invoiceDate : item.purchaseDate,
    partyName: isSales ? item.customerName : item.vendorName,
    partyGst: isSales ? item.customerGst : item.vendorGst,
    amount: num(isSales ? item.invoiceAmount : item.billAmount),
    item: item.item,
    unit: item.unit,
    hsn: item.hsn,
    quantity: num(item.quantity),
    taxableValue: num(item.taxableValue),
    cgst: num(item.cgstAmount),
    sgst: num(item.sgstAmount),
    cgstPct: num(item.cgstPercent),
    sgstPct: num(item.sgstPercent),
  };
};

export default function GstReportPage() {
  const [gstType, setGstType] = useState("sales"); // "sales" | "purchase"
  const [gstData, setGstData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
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
      return [a.street, a.city, a.state, a.postalCode]
        .filter(Boolean)
        .join(", ");
    }
    return String(storedata.address);
  })();
  const gstin = storedata?.gstNumber || storedata?.gstin || "";

  const endpoint =
    gstType === "sales" ? "/invoice/gst-sales-report" : "/invoice/gst-purchase";

  const formattedRange = useMemo(
    () => `${formatShort(startDate)} – ${formatShort(endDate)}`,
    [startDate, endDate],
  );

  // ── fetch ─────────────────────────────────────────────────────────────
  const fetchReport = useCallback(
    async (start = startDate, end = endDate, ep = endpoint) => {
      if (!start || !end) {
        toast.error("Please select both start and end dates.");
        return;
      }
      try {
        setLoading(true);
        const res = await api.get(ep, {
          params: {
            startDate: toInputDate(start),
            endDate: toInputDate(end),
          },
        });

        let rows = [];
        if (Array.isArray(res?.data)) {
          rows = res.data;
        } else if (Array.isArray(res?.data?.data)) {
          rows = res.data.data;
        }
        setGstData(rows);
        setHasFetched(true);

        if (!rows.length) {
          toast.error("No records found for the selected period.");
        }
      } catch (err) {
        console.error("GST fetch error:", err?.message);
        toast.error("Failed to fetch GST report.");
        setGstData([]);
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, endpoint],
  );

  // Re-fetch automatically when switching Sales/Purchase, if dates already picked
  const handleTypeChange = (value) => {
    setGstType(value);
    setGstData([]);
    setHasFetched(false);
    if (startDate && endDate) {
      const ep =
        value === "sales"
          ? "/invoice/gst-sales-report"
          : "/invoice/gst-purchase";
      fetchReport(startDate, endDate, ep);
    }
  };

  // ── quick-select ─────────────────────────────────────────────────────
  const applyRange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    fetchReport(start, end, endpoint);
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
      new Date(today.getFullYear(), today.getMonth(), 0),
    );
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
    setGstData([]);
    setHasFetched(false);
  };

  // ── totals (always over full fetched dataset) ──────────────────────────
  const totals = useMemo(() => {
    const rows = gstData.map((r) => getRow(r, gstType));
    return {
      count: rows.length,
      taxableValue: rows.reduce((s, r) => s + r.taxableValue, 0),
      cgst: rows.reduce((s, r) => s + r.cgst, 0),
      sgst: rows.reduce((s, r) => s + r.sgst, 0),
      totalGst: rows.reduce((s, r) => s + r.cgst + r.sgst, 0),
      totalAmount: rows.reduce((s, r) => s + r.amount, 0),
    };
  }, [gstData, gstType]);

  const normalizedRows = useMemo(
    () => gstData.map((r) => getRow(r, gstType)),
    [gstData, gstType],
  );

  const hasData = normalizedRows.length > 0;

  // ── PDF export ───────────────────────────────────────────────────────
  const buildHTML = () => {
    const partyLabel = gstType === "sales" ? "Customer" : "Vendor";
    const invoiceLabel = gstType === "sales" ? "Invoice No" : "Bill No";

    const rowsHTML = normalizedRows
      .map(
        (r, i) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${i + 1}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${formatDDMMYY(r.date)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(r.invoiceNo)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(r.partyName)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(r.partyGst)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;">${safe(r.hsn)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${r.quantity}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(r.taxableValue)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(r.cgst)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${currency(r.sgst)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:10px;text-align:right;font-weight:700;">${currency(r.amount)}</td>
      </tr>`,
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
        <h1>GST ${gstType === "sales" ? "Sales" : "Purchase"} Report</h1>
        <div class="sub">Period: ${formattedRange}</div>
        <div class="chips">
          <div class="chip">Entries: ${totals.count}</div>
          <div class="chip">Taxable: ${currency(totals.taxableValue)}</div>
          <div class="chip">CGST: ${currency(totals.cgst)}</div>
          <div class="chip">SGST: ${currency(totals.sgst)}</div>
          <div class="chip" style="background:#e8f0fe;border-color:#3b5bdb;">
            <b>Total GST: ${currency(totals.totalGst)}</b>
          </div>
          <div class="chip" style="background:#e6f9ee;border-color:#2f9e44;">
            <b>Total Amount: ${currency(totals.totalAmount)}</b>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f0f4ff;">
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">#</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">Date</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">${invoiceLabel}</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">${partyLabel}</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">GSTIN</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:left;">HSN</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Qty</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Taxable</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">CGST</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">SGST</th>
              <th style="padding:6px;border-bottom:1px solid #ddd;font-size:11px;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
            <tr>
              <td colspan="10" style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">Total:</td>
              <td style="padding:6px;text-align:right;font-weight:bold;border-top:2px solid #333;">${currency(totals.totalAmount)}</td>
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
      const partyLabel = gstType === "sales" ? "Customer" : "Vendor";
      const invoiceLabel = gstType === "sales" ? "Invoice No" : "Bill No";

      const sheet = normalizedRows.map((r, i) => ({
        "#": i + 1,
        Date: formatDDMMYY(r.date),
        [invoiceLabel]: safe(r.invoiceNo),
        [partyLabel]: safe(r.partyName),
        GSTIN: safe(r.partyGst),
        Item: safe(r.item),
        HSN: safe(r.hsn),
        Qty: r.quantity,
        "Taxable Value": r.taxableValue,
        "CGST %": r.cgstPct,
        CGST: r.cgst,
        "SGST %": r.sgstPct,
        SGST: r.sgst,
        Amount: r.amount,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sheet);
      XLSX.utils.book_append_sheet(
        wb,
        ws,
        gstType === "sales" ? "GST Sales" : "GST Purchase",
      );

      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GST_${gstType === "sales" ? "Sales" : "Purchase"}_Report_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
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

  const partyLabel = gstType === "sales" ? "Customer" : "Vendor";
  const invoiceLabel = gstType === "sales" ? "Invoice No" : "Bill No";

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
          <h1 className="text-lg font-bold text-slate-900">GST Report</h1>
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
        {/* Sales / Purchase toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          {[
            { value: "sales", label: "Sales GST" },
            { value: "purchase", label: "Purchase GST" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTypeChange(opt.value)}
              disabled={loading}
              className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${
                gstType === opt.value
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={toInputDate(startDate)}
              max={toInputDate(new Date())}
              onChange={(e) =>
                setStartDate(e.target.value ? new Date(e.target.value) : null)
              }
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={toInputDate(endDate)}
              max={toInputDate(new Date())}
              onChange={(e) =>
                setEndDate(e.target.value ? new Date(e.target.value) : null)
              }
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
          onClick={() => fetchReport(startDate, endDate, endpoint)}
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
          <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 mb-5">
            <div className="text-xs text-slate-400 mb-3">{formattedRange}</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SummaryStat
                label="Amount"
                value={currency(totals.totalAmount)}
                bold
              />
              <SummaryStat
                label="Taxable"
                value={currency(totals.taxableValue)}
              />
              <SummaryStat
                label="CGST"
                value={currency(totals.cgst)}
                accent="text-red-600"
              />
              <SummaryStat
                label="SGST"
                value={currency(totals.sgst)}
                accent="text-red-600"
              />
              <SummaryStat
                label="Total GST"
                value={currency(totals.totalGst)}
                accent="text-blue-600"
                bold
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden mb-5">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                {gstType === "sales" ? "Sales" : "Purchase"} GST Entries
              </h2>
              <span className="text-xs text-slate-400">
                {totals.count} entries
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left font-semibold px-4 py-3">Date</th>
                    <th className="text-left font-semibold px-4 py-3">
                      {invoiceLabel}
                    </th>
                    <th className="text-left font-semibold px-4 py-3">
                      {partyLabel}
                    </th>
                    <th className="text-left font-semibold px-4 py-3">GSTIN</th>
                    <th className="text-left font-semibold px-4 py-3">HSN</th>
                    <th className="text-right font-semibold px-4 py-3">Qty</th>
                    <th className="text-right font-semibold px-4 py-3">
                      Taxable
                    </th>
                    <th className="text-right font-semibold px-4 py-3">CGST</th>
                    <th className="text-right font-semibold px-4 py-3">SGST</th>
                    <th className="text-right font-semibold px-4 py-3">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {normalizedRows?.map((r, i) => (
                    <tr
                      key={`${r?.id || "row"}-${i}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDDMMYY(r.date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {safe(r.invoiceNo)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {safe(r.partyName)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {safe(r.partyGst)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {safe(r.hsn)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {r.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {currency(r.taxableValue)}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        {currency(r.cgst)}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        {currency(r.sgst)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {currency(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-semibold text-slate-800">
                    <td colSpan={9} className="px-4 py-3 text-right">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right">
                      {currency(totals.totalAmount)}
                    </td>
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
      <div
        className={`${bold ? "text-lg" : "text-base"} font-bold ${accent || "text-slate-800"} truncate`}
      >
        {value}
      </div>
    </div>
  );
}

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
import { useAuth } from "../../context/AuthContext";

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
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fromInputDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const PAYMENT_METHODS = [
  { value: "", label: "All Methods" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
];

const methodLabel = (m) =>
  PAYMENT_METHODS.find((p) => p.value === m)?.label || safe(m);

export default function DueCollectionReportPage() {
  const { isStaff, authState } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [activeRange, setActiveRange] = useState(null);

  // Filter dropdown-er user list (/store/users API theke)
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [expandedUsers, setExpandedUsers] = useState({});
  const [storedata, setStoredata] = useState({});

  // store info (PDF header-er jonno)
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

  // user list (shudhu OWNER-er jonno filter dropdown) — Users page-er same API
  useEffect(() => {
    if (isStaff) return;
    if (authState && authState.isAuthenticated === false) return;
    (async () => {
      try {
        const res = await api.get("/store/users");
        if (res?.success && Array.isArray(res?.data)) {
          setUserList(res.data);
        }
      } catch {
        /* silent */
      }
    })();
  }, [isStaff, authState?.isAuthenticated]);

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

  const toggleUser = useCallback((id) => {
    setExpandedUsers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ── fetch ────────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = [];

      if (activeRange) {
        params.push(`range=${activeRange}`);
      } else {
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
      }

      if (!isStaff && selectedUser) params.push(`userId=${selectedUser}`);
      if (paymentMethod) params.push(`paymentMethod=${paymentMethod}`);

      const query = params.length ? `?${params.join("&")}` : "";
      const res = await api.get(`/invoice/due-collection-report${query}`);
      let rows = res?.data?.data ?? res?.data ?? [];
      if (!Array.isArray(rows)) rows = [];

      setUsers(rows);
      setExpandedUsers({});
      setHasFetched(true);
      if (!rows.length) toast.error("No records found for the selected filters.");
    } catch (e) {
      console.error("Due collection report fetch error:", e?.message);
      toast.error("Failed to fetch due collection report.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [activeRange, startDate, endDate, selectedUser, paymentMethod, isStaff]);

  // date range / filter change hole auto-fetch
  useEffect(() => {
    if (startDate && endDate) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, activeRange, selectedUser, paymentMethod]);

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
    setSelectedUser("");
    setPaymentMethod("");
    setExpandedUsers({});
    setUsers([]);
    setHasFetched(false);
  };

  // ── totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    return users.reduce(
      (acc, u) => ({
        userCount: acc.userCount + 1,
        paymentCount: acc.paymentCount + num(u.totalPayments),
        totalCollected: acc.totalCollected + num(u.totalCollected),
      }),
      { userCount: 0, paymentCount: 0, totalCollected: 0 }
    );
  }, [users]);

  const hasData = users.length > 0;

  const emptyMessage =
    !startDate && !endDate
      ? "Select a date range and tap Generate."
      : hasFetched
      ? "No records found for the selected filters."
      : "Tap Generate to load the report.";

  // ── PDF export ───────────────────────────────────────────────────────
  const buildHTML = () => {
    const userBlocks = users
      .map((u) => {
        const rows = [...(u.collections || [])]
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map(
            (c) => `
            <tr>
              <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${
                c.date ? new Date(c.date).toLocaleString("en-IN") : "-"
              }</td>
              <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${safe(c.invoiceNumber)}</td>
              <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${safe(c.customerName)}</td>
              <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;">${methodLabel(c.paymentMethod)}</td>
              <td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#2e7d32;">${currency(c.amount)}</td>
            </tr>`
          )
          .join("");

        return `
          <div style="margin-bottom:18px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
            <div style="background:#f5f5f5;padding:8px 12px;border-bottom:1px solid #e0e0e0;display:flex;justify-content:space-between;">
              <strong style="font-size:12px;">${safe(u.userName)}</strong>
              <div style="font-size:10px;color:#555;">${u.totalPayments || 0} payments</div>
            </div>
            <div style="padding:6px 12px;background:#fafafa;border-bottom:1px solid #e0e0e0;">
              <span style="font-size:10px;color:#2e7d32;"><b>Total Collected:</b> ${currency(u.totalCollected)}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#fafafa;">
                  <th style="padding:6px 10px;font-size:10px;text-align:left;border-bottom:1px solid #ddd;">Date</th>
                  <th style="padding:6px 10px;font-size:10px;text-align:left;border-bottom:1px solid #ddd;">Invoice No</th>
                  <th style="padding:6px 10px;font-size:10px;text-align:left;border-bottom:1px solid #ddd;">Customer</th>
                  <th style="padding:6px 10px;font-size:10px;text-align:left;border-bottom:1px solid #ddd;">Method</th>
                  <th style="padding:6px 10px;font-size:10px;text-align:right;border-bottom:1px solid #ddd;">Amount</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
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
        <h1>Due Collection Report</h1>
        <div class="sub">Period: ${formattedRange}</div>
        <div class="chips">
          <div class="chip">Users: ${totals.userCount}</div>
          <div class="chip">Payments: ${totals.paymentCount}</div>
          <div class="chip" style="background:#e8f5e9;border-color:#2e7d32;">
            <b>Total Collected: ${currency(totals.totalCollected)}</b>
          </div>
        </div>
        ${userBlocks || `<p style="color:#888;">No records found.</p>`}
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
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup blocked — please allow popups to export PDF.");
      return;
    }
    w.document.open();
    w.document.write(buildHTML());
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

      const summaryData = users.map((u) => ({
        "User Name": u.userName || "-",
        Email: u.userEmail || "-",
        "Total Payments": u.totalPayments || 0,
        "Total Collected": num(u.totalCollected),
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary["!cols"] = Object.keys(summaryData[0] || {}).map((k) => ({
        wch: Math.max(14, k.length + 2),
      }));
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      const detailRows = [];
      users.forEach((u) => {
        [...(u.collections || [])]
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .forEach((c) => {
            detailRows.push({
              "User Name": u.userName || "-",
              Date: c.date ? new Date(c.date).toLocaleString("en-IN") : "-",
              "Invoice No": c.invoiceNumber || "-",
              Customer: c.customerName || "-",
              Mobile: c.customerMobile || "-",
              Method: methodLabel(c.paymentMethod),
              Amount: num(c.amount),
              Note: c.note || "-",
            });
          });
      });

      if (detailRows.length) {
        const wsDetail = XLSX.utils.json_to_sheet(detailRows);
        wsDetail["!cols"] = Object.keys(detailRows[0]).map((k) => ({
          wch: Math.max(14, k.length + 2),
        }));
        XLSX.utils.book_append_sheet(wb, wsDetail, "All Collections");
      }

      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Due_Collection_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
            <button
              onClick={() => window.history.back()}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">Due Collection Report</h1>
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
                onChange={(e) => {
                  setActiveRange(null);
                  setStartDate(fromInputDate(e.target.value));
                }}
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
                onChange={(e) => {
                  setActiveRange(null);
                  setEndDate(fromInputDate(e.target.value));
                }}
                className="h-9 w-[150px] pl-8 pr-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 shrink-0" />

          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { value: "today", label: "Today", fn: applyToday },
              { value: "yesterday", label: "Yesterday", fn: applyYesterday },
              { value: "thisWeek", label: "This Week", fn: applyThisWeek },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={opt.fn}
                disabled={loading}
                className={`h-9 px-3 rounded-lg text-[12.5px] font-semibold transition-colors ${
                  activeRange === opt.value
                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                    : "text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
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

          {/* OWNER-er jonno user filter (/store/users API) */}
          {!isStaff && (
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              <option value="">All Users</option>
              {userList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name || s.phone || s.email}
                  {s.role?.name ? ` (${s.role.name})` : ""}
                </option>
              ))}
            </select>
          )}

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <button
            onClick={clearAll}
            disabled={loading}
            title="Clear filters"
            className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <CalendarX2 className="w-4 h-4" />
          </button>

          <button
            onClick={fetchReport}
            disabled={loading || (!startDate && !endDate)}
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
            <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3.5 mb-4">
              <div className="text-xs text-slate-400 mb-2">{formattedRange}</div>
              <div className="grid grid-cols-3 gap-4">
                <SummaryStat label="Users" value={String(totals.userCount)} />
                <SummaryStat label="Payments" value={String(totals.paymentCount)} />
                <SummaryStat
                  label="Total Collected"
                  value={currency(totals.totalCollected)}
                  accent="text-emerald-600"
                  bold
                />
              </div>
            </div>

            <div className="space-y-3">
              {users.map((u) => {
                const isExpanded = !!expandedUsers[u.userId];
                const sorted = [...(u.collections || [])].sort(
                  (a, b) => new Date(b.date) - new Date(a.date)
                );
                return (
                  <div
                    key={u.userId}
                    className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleUser(u.userId)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-sm font-bold text-slate-800 truncate">
                            {safe(u.userName)}
                          </span>
                        </div>
                        {u.userEmail && (
                          <div className="mt-1 pl-6 text-xs text-slate-400">{u.userEmail}</div>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 mr-3 shrink-0">
                        {u.totalPayments || 0} payments
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                      <SummaryStat
                        label="Total Collected"
                        value={currency(u.totalCollected)}
                        accent="text-emerald-600"
                      />
                    </div>

                    {isExpanded && (
                      <div className="overflow-x-auto border-t border-slate-100">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                              <th className="text-left font-semibold px-4 py-2.5">Date</th>
                              <th className="text-left font-semibold px-4 py-2.5">Invoice No</th>
                              <th className="text-left font-semibold px-4 py-2.5">Customer</th>
                              <th className="text-left font-semibold px-4 py-2.5">Method</th>
                              <th className="text-right font-semibold px-4 py-2.5">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sorted.map((c, idx) => (
                              <tr key={c._id || idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                                  {c.date ? new Date(c.date).toLocaleString("en-IN") : "-"}
                                </td>
                                <td className="px-4 py-2.5 text-slate-700">{safe(c.invoiceNumber)}</td>
                                <td className="px-4 py-2.5 text-slate-700">
                                  <div>{safe(c.customerName)}</div>
                                  {c.customerMobile && (
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                      <Phone className="w-3 h-3" />
                                      {c.customerMobile}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">{methodLabel(c.paymentMethod)}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                                  {currency(c.amount)}
                                </td>
                              </tr>
                            ))}
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
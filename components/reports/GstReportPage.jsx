"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Calendar,
  CalendarX2,
  FileText,
  FileSpreadsheet,
  FileJson,
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
        _id, invoiceNumber, invoiceDate,
        customerName / supplierName, customerGst / supplierGst,
        item, unit, quantity, hsn, gstRate, isIgst,
        taxableValue, cgstAmount, sgstAmount, igstAmount,
        cgstPercent, sgstPercent, igstPercent,
        invoiceAmount
      }
    ]
  }
  NOTE: Multi-item invoices come as multiple rows with the SAME _id and
  the SAME invoiceAmount (invoice-level total repeated on each row).
*/

// ── helpers ─────────────────────────────────────────────────────────────
const num = (v) => Number(v || 0);
const r2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;

const currency = (v) =>
  `₹${num(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const safe = (v) =>
  v === undefined || v === null || v === "" || v === "-" ? "-" : String(v);

const qtyFmt = (v) => String(Number(num(v).toFixed(3)));

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Always format in IST so dates don't shift by browser timezone
const formatDDMMYY = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }); // dd/mm/yyyy
};

// GST portal date format → dd-mm-yyyy
const formatGstDate = (dateStr) => formatDDMMYY(dateStr).replace(/\//g, "-");

const formatShort = (date) => {
  if (!date) return "All";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
};

// Local date → "YYYY-MM-DD" (avoids UTC shift from toISOString)
const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// "YYYY-MM-DD" → local Date (new Date("YYYY-MM-DD") would be UTC midnight)
const parseInputDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const isValidGstin = (v) =>
  GSTIN_REGEX.test(
    String(v || "")
      .trim()
      .toUpperCase(),
  );

const UQC_MAP = {
  piece: "PCS",
  pieces: "PCS",
  pcs: "PCS",
  box: "BOX",
  carton: "CTN",
  acre: "ACS",
  kg: "KGS",
  kgs: "KGS",
  litre: "LTR",
  ltr: "LTR",
  meter: "MTR",
  mtr: "MTR",
  dozen: "DOZ",
  pair: "PRS",
  set: "SET",
};
const toUqc = (u) =>
  UQC_MAP[
    String(u || "")
      .trim()
      .toLowerCase()
  ] || "OTH";

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── GST JSON structure-er moto table definition (Excel + PDF dutoi eta use kore) ──
const gstCol = (key, label, type = "text", sum = false) => ({
  key,
  type,
  sum,
  header: `${label} (${key})`,
});

const GST_TAX_COLS = [
  gstCol("txval", "Taxable Value", "money", true),
  gstCol("iamt", "Integrated Tax", "money", true),
  gstCol("camt", "Central Tax", "money", true),
  gstCol("samt", "State/UT Tax", "money", true),
  gstCol("csamt", "Cess", "money", true),
];

const GST_TABLE_DEFS = {
  b2b: {
    title: "B2B Invoices",
    sheet: "B2B",
    cols: [
      gstCol("ctin", "GSTIN/UIN"),
      gstCol("inum", "Invoice No"),
      gstCol("idt", "Invoice Date"),
      gstCol("val", "Invoice Value", "money", true),
      gstCol("pos", "Place of Supply"),
      gstCol("rchrg", "Reverse Charge"),
      gstCol("inv_typ", "Invoice Type"),
      gstCol("num", "Item No", "int"),
      gstCol("rt", "Rate", "rate"),
      ...GST_TAX_COLS,
    ],
  },
  b2bur: {
    title: "B2B Unregistered (Purchase)",
    sheet: "B2BUR",
    cols: [
      gstCol("inum", "Invoice No"),
      gstCol("idt", "Invoice Date"),
      gstCol("val", "Invoice Value", "money", true),
      gstCol("pos", "Place of Supply"),
      gstCol("sply_ty", "Supply Type"),
      gstCol("num", "Item No", "int"),
      gstCol("rt", "Rate", "rate"),
      ...GST_TAX_COLS,
    ],
  },
  b2cs: {
    title: "B2C Small (Consolidated)",
    sheet: "B2CS",
    cols: [
      gstCol("sply_ty", "Supply Type"),
      gstCol("pos", "Place of Supply"),
      gstCol("typ", "Type"),
      gstCol("rt", "Rate", "rate"),
      ...GST_TAX_COLS,
    ],
  },
  hsn: {
    title: "HSN Summary",
    sheet: "HSN",
    cols: [
      gstCol("num", "S.No", "int"),
      gstCol("hsn_sc", "HSN Code"),
      gstCol("uqc", "UQC"),
      gstCol("rt", "Rate", "rate"),
      gstCol("qty", "Quantity", "qty", true),
      ...GST_TAX_COLS,
    ],
  },
};

// invoice-er item gulo ke flat row banay. Invoice-level field shudhu prothom row-e thake.
const flattenInvItems = (inv) =>
  (inv.itms || []).map((it, idx) => ({
    ...(idx === 0
      ? {
          inum: inv.inum,
          idt: inv.idt,
          val: inv.val,
          pos: inv.pos,
          rchrg: inv.rchrg,
          inv_typ: inv.inv_typ,
          sply_ty: inv.sply_ty,
        }
      : {}),
    num: it.num,
    rt: it.itm_det?.rt,
    txval: it.itm_det?.txval,
    iamt: it.itm_det?.iamt,
    camt: it.itm_det?.camt,
    samt: it.itm_det?.samt,
    csamt: it.itm_det?.csamt,
  }));

// JSON payload theke table list banay
const buildGstTables = (payload, gstType) => {
  const b2bRows = [];
  (payload.b2b || []).forEach((party) => {
    const start = b2bRows.length;
    (party.inv || []).forEach((inv) => b2bRows.push(...flattenInvItems(inv)));
    if (b2bRows[start]) b2bRows[start].ctin = party.ctin;
  });

  const defs = [{ id: "b2b", rows: b2bRows }];
  if (gstType === "sales") {
    defs.push({ id: "b2cs", rows: payload.b2cs || [] });
    defs.push({ id: "hsn", rows: payload.hsn?.data || [] });
  } else {
    defs.push({
      id: "b2bur",
      rows: (payload.b2bur || []).flatMap((inv) => flattenInvItems(inv)),
    });
  }

  return defs
    .filter((d) => d.rows.length > 0)
    .map((d) => ({ ...GST_TABLE_DEFS[d.id], id: d.id, rows: d.rows }));
};

const fmtGstCell = (c, v, forExcel = false) => {
  if (v === undefined || v === null || v === "") return "";
  if (c.type === "money") return forExcel ? r2(v) : num(v).toFixed(2);
  if (c.type === "qty") return forExcel ? Number(num(v).toFixed(3)) : qtyFmt(v);
  if (c.type === "rate" || c.type === "int") return num(v);
  return String(v);
};

const gstTableTotals = (t) => {
  const tot = {};
  t.cols.forEach((c) => {
    if (c.sum) tot[c.key] = t.rows.reduce((s, r) => s + num(r[c.key]), 0);
  });
  return tot;
};

// Normalizes a row regardless of sales/purchase shape
const getRow = (item, gstType) => {
  const isSales = gstType === "sales";
  const cgst = num(item.cgstAmount);
  const sgst = num(item.sgstAmount);
  const igst = num(item.igstAmount);
  const taxableValue = num(item.taxableValue);

  return {
    id: item._id,
    invoiceNo: item.invoiceNumber ?? item.billNumber,
    date: item.invoiceDate ?? item.purchaseDate,
    partyName: isSales
      ? (item.customerName ?? item.partyName)
      : (item.supplierName ?? item.vendorName),
    partyGst: isSales
      ? (item.customerGst ?? item.partyGst)
      : (item.supplierGst ?? item.vendorGst),
    invoiceAmount: num(item.invoiceAmount ?? item.billAmount), // whole invoice total
    item: item.item,
    unit: item.unit,
    hsn: item.hsn,
    quantity: num(item.quantity),
    taxableValue,
    gstRate: num(item.gstRate),
    isIgst: !!item.isIgst,
    cgst,
    sgst,
    igst,
    cgstPct: num(item.cgstPercent),
    sgstPct: num(item.sgstPercent),
    igstPct: num(item.igstPercent),
    totalGst: cgst + sgst + igst,
  };
};

// Item label: "Item (unit)" — same as mobile
const itemLabel = (r) => `${safe(r.item)}${r.unit ? ` (${r.unit})` : ""}`;

export default function GstReportPage() {
  const [gstType, setGstType] = useState("sales"); // "sales" | "purchase"
  const [gstData, setGstData] = useState([]);
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
      return [a.street, a.city, a.state, a.postalCode]
        .filter(Boolean)
        .join(", ");
    }
    return String(storedata.address);
  })();
  const gstin = (storedata?.gstNumber || storedata?.gstin || "").trim();

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

  // ── rows (grouped by invoice _id, invoice-level info only on first row) ──
  const normalizedRows = useMemo(() => {
    const groups = new Map();
    gstData.forEach((raw) => {
      const key = raw._id ?? `${raw.invoiceNumber}-${raw.invoiceDate}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(raw);
    });

    const out = [];
    groups.forEach((rows) => {
      rows.forEach((raw, idx) => {
        out.push({ ...getRow(raw, gstType), isFirst: idx === 0 });
      });
    });
    return out;
  }, [gstData, gstType]);

  // ── totals ───────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let taxableValue = 0,
      cgst = 0,
      sgst = 0,
      igst = 0,
      totalAmount = 0,
      invoices = 0;

    normalizedRows.forEach((r) => {
      taxableValue += r.taxableValue;
      cgst += r.cgst;
      sgst += r.sgst;
      igst += r.igst;
      if (r.isFirst) {
        invoices += 1;
        totalAmount += r.invoiceAmount; // count each invoice once
      }
    });

    return {
      count: invoices,
      lines: normalizedRows.length,
      taxableValue,
      cgst,
      sgst,
      igst,
      totalGst: cgst + sgst + igst,
      totalAmount,
    };
  }, [normalizedRows]);

  const hasData = normalizedRows.length > 0;

  const partyLabel = gstType === "sales" ? "Customer" : "Vendor";
  const invoiceLabel = gstType === "sales" ? "Invoice No" : "Bill No";

  const buildHTML = () => {
    const payload = buildGstJson();
    const tables = buildGstTables(payload, gstType);

    const th =
      "padding:5px 4px;border-bottom:1px solid #ddd;font-size:8.5px;background:#f0f4ff;";
    const td = "padding:4px;border-bottom:1px solid #eee;font-size:9px;";
    const tf =
      "padding:5px 4px;font-weight:bold;border-top:2px solid #333;font-size:9px;";
    const alignOf = (c) => (c.type === "text" ? "left" : "right");

    const tablesHTML = tables.length
      ? tables
          .map((t) => {
            const tot = gstTableTotals(t);
            const head = t.cols
              .map(
                (c) =>
                  `<th style="${th}text-align:${alignOf(c)};">${escapeHtml(c.header)}</th>`,
              )
              .join("");
            const body = t.rows
              .map(
                (r) =>
                  `<tr>${t.cols
                    .map(
                      (c) =>
                        `<td style="${td}text-align:${alignOf(c)};">${escapeHtml(fmtGstCell(c, r[c.key]))}</td>`,
                    )
                    .join("")}</tr>`,
              )
              .join("");
            const foot = `<tr>${t.cols
              .map(
                (c, i) =>
                  `<td style="${tf}text-align:${i === 0 ? "left" : "right"};">${
                    i === 0
                      ? "Total"
                      : c.sum
                        ? escapeHtml(fmtGstCell(c, tot[c.key]))
                        : ""
                  }</td>`,
              )
              .join("")}</tr>`;
            return `
              <h3 style="font-size:12px;margin:16px 0 6px;color:#2c5aa0;">${escapeHtml(t.title)} <span style="color:#888;font-weight:normal;">(${t.id})</span></h3>
              <table style="width:100%;border-collapse:collapse;">
                <thead><tr>${head}</tr></thead>
                <tbody>${body}${foot}</tbody>
              </table>`;
          })
          .join("")
      : `<p style="margin-top:16px;">No GST data found.</p>`;

    return `
      <html><head><meta charset="utf-8"/>
      <style>
        @page { size: A4 landscape; margin: 20px; }
        body { font-family:Roboto,Arial; margin:0; padding:16px; color:#111; font-size:11px; }
        h1   { font-size:18px; margin-bottom:2px; }
        .sub { color:#666; margin-bottom:14px; }
        .chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px; }
        .chip  { background:#f0f0f0; border:1px solid #ddd; border-radius:12px; padding:4px 10px; font-size:10px; }
        .footer{ margin-top:14px; color:#888; font-size:9px; display:flex; justify-content:space-between; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
      </style></head><body>
        <h2 style="text-align:center;">${escapeHtml(storeName)}</h2>
        ${address ? `<p style="text-align:center;">${escapeHtml(address)}</p>` : ""}
        ${gstin ? `<p style="text-align:center;">GSTIN: ${escapeHtml(gstin)}</p>` : ""}
        <h1>GST ${gstType === "sales" ? "Sales" : "Purchase"} Report</h1>
        <div class="sub">Period: ${formattedRange} &nbsp;|&nbsp; Filing Period (fp): ${escapeHtml(payload.fp)}</div>
        <div class="chips">
          <div class="chip">Count: ${totals.count}</div>
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
        ${tablesHTML}
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

    const exportExcel = () => {
    if (!hasData) {
      toast.error("Generate a report first.");
      return;
    }
    try {
      const payload = buildGstJson();
      const tables = buildGstTables(payload, gstType);
      if (!tables.length) {
        toast.error("No GST data to export.");
        return;
      }

      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryRows = [
        ["Report", gstType === "sales" ? "GST Sales" : "GST Purchase"],
        ["gstin", payload.gstin || ""],
        ["fp", payload.fp],
        ["Period", formattedRange],
        ["Invoices", totals.count],
        ["Taxable Value", r2(totals.taxableValue)],
        ["Central Tax (CGST)", r2(totals.cgst)],
        ["State/UT Tax (SGST)", r2(totals.sgst)],
        ["Integrated Tax (IGST)", r2(totals.igst)],
        ["Total GST", r2(totals.totalGst)],
        ["Total Amount", r2(totals.totalAmount)],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary["!cols"] = [{ wch: 24 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // JSON-er prottek section-er jonno ekta sheet
      tables.forEach((t) => {
        const tot = gstTableTotals(t);
        const header = t.cols.map((c) => c.header);
        const body = t.rows.map((r) =>
          t.cols.map((c) => fmtGstCell(c, r[c.key], true)),
        );
        const footer = t.cols.map((c, i) =>
          i === 0 ? "Total" : c.sum ? fmtGstCell(c, tot[c.key], true) : "",
        );
        const ws = XLSX.utils.aoa_to_sheet([header, ...body, footer]);
        ws["!cols"] = t.cols.map((c) => ({
          wch: Math.max(14, c.header.length + 2),
        }));
        XLSX.utils.book_append_sheet(wb, ws, t.sheet);
      });

      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      downloadBlob(
        blob,
        `GST_${gstType === "sales" ? "Sales" : "Purchase"}_Report_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`,
      );

      toast.success("Excel file downloaded.");
    } catch (e) {
      console.error("Excel export error:", e?.message);
      toast.error("Could not generate Excel file.");
    }
  };

  // ── GST JSON export (GST portal / offline-tool style) ────────────────
  const buildGstJson = () => {
    const ownGstin = gstin.toUpperCase();
    const ownState = ownGstin.slice(0, 2);

    // filing period (MMYYYY) comes from the end date
    const fpDate = endDate || new Date();
    const fp = `${String(fpDate.getMonth() + 1).padStart(2, "0")}${fpDate.getFullYear()}`;

    // 1) rebuild invoices from contiguous rows
    const invoices = [];
    normalizedRows.forEach((r) => {
      if (r.isFirst) {
        invoices.push({
          inum: String(r.invoiceNo ?? ""),
          idt: formatGstDate(r.date),
          val: r2(r.invoiceAmount),
          ctin: String(r.partyGst || "")
            .trim()
            .toUpperCase(),
          partyName: r.partyName || "",
          lines: [],
        });
      }
      invoices[invoices.length - 1].lines.push(r);
    });

    // 2) build invoice node (rate-wise item summary as the GST portal expects)
    const buildInv = (inv) => {
      const pos = isValidGstin(inv.ctin) ? inv.ctin.slice(0, 2) : ownState;
      const byRate = new Map();
      inv.lines.forEach((l) => {
        const rt = l.gstRate || l.cgstPct + l.sgstPct + l.igstPct;
        if (!byRate.has(rt)) {
          byRate.set(rt, { rt, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 });
        }
        const a = byRate.get(rt);
        a.txval += l.taxableValue;
        a.iamt += l.igst;
        a.camt += l.cgst;
        a.samt += l.sgst;
      });
      const itms = Array.from(byRate.values()).map((a, idx) => ({
        num: idx + 1,
        itm_det: {
          rt: a.rt,
          txval: r2(a.txval),
          iamt: r2(a.iamt),
          camt: r2(a.camt),
          samt: r2(a.samt),
          csamt: 0,
        },
      }));
      return {
        inum: inv.inum,
        idt: inv.idt,
        val: inv.val,
        pos,
        rchrg: "N",
        inv_typ: "R",
        itms,
      };
    };

    const payload = { gstin: ownGstin, fp };

    // 3) B2B (registered parties)
    const b2bMap = new Map();
    const unregistered = [];
    invoices.forEach((inv) => {
      if (isValidGstin(inv.ctin)) {
        if (!b2bMap.has(inv.ctin)) b2bMap.set(inv.ctin, []);
        b2bMap.get(inv.ctin).push(buildInv(inv));
      } else {
        unregistered.push(inv);
      }
    });
    payload.b2b = Array.from(b2bMap.entries()).map(([ctin, inv]) => ({
      ctin,
      inv,
    }));

    if (gstType === "sales") {
      // B2CS → consolidated by place of supply + rate
      const b2csMap = new Map();
      unregistered.forEach((inv) => {
        inv.lines.forEach((l) => {
          const rt = l.gstRate || l.cgstPct + l.sgstPct + l.igstPct;
          const pos = ownState;
          const sply_ty = l.isIgst ? "INTER" : "INTRA";
          const key = `${pos}|${rt}|${sply_ty}`;
          if (!b2csMap.has(key)) {
            b2csMap.set(key, {
              sply_ty,
              pos,
              typ: "OE",
              rt,
              txval: 0,
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0,
            });
          }
          const a = b2csMap.get(key);
          a.txval += l.taxableValue;
          a.iamt += l.igst;
          a.camt += l.cgst;
          a.samt += l.sgst;
        });
      });
      payload.b2cs = Array.from(b2csMap.values()).map((a) => ({
        ...a,
        txval: r2(a.txval),
        iamt: r2(a.iamt),
        camt: r2(a.camt),
        samt: r2(a.samt),
      }));

      // HSN summary
      const hsnMap = new Map();
      normalizedRows.forEach((r) => {
        const code = String(r.hsn || "").trim();
        if (!code || code === "-") return;
        const uqc = toUqc(r.unit);
        const rt = r.gstRate;
        const key = `${code}|${uqc}|${rt}`;
        if (!hsnMap.has(key)) {
          hsnMap.set(key, {
            hsn_sc: code,
            uqc,
            rt,
            qty: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          });
        }
        const a = hsnMap.get(key);
        a.qty += r.quantity;
        a.txval += r.taxableValue;
        a.iamt += r.igst;
        a.camt += r.cgst;
        a.samt += r.sgst;
      });
      payload.hsn = {
        data: Array.from(hsnMap.values()).map((a, i) => ({
          num: i + 1,
          ...a,
          qty: Number(a.qty.toFixed(3)),
          txval: r2(a.txval),
          iamt: r2(a.iamt),
          camt: r2(a.camt),
          samt: r2(a.samt),
        })),
      };
    } else {
      // Purchase → unregistered suppliers listed separately
      payload.b2bur = unregistered.map((inv) => {
        const n = buildInv(inv);
        return {
          inum: n.inum,
          idt: n.idt,
          val: n.val,
          pos: n.pos,
          sply_ty: inv.lines.some((l) => l.isIgst) ? "INTER" : "INTRA",
          itms: n.itms,
        };
      });
    }

    return payload;
  };

  const exportJSON = () => {
    if (!hasData) {
      toast.error("Generate a report first.");
      return;
    }
    if (!isValidGstin(gstin)) {
      toast.error(
        "Store GSTIN missing or invalid — update store profile first.",
      );
      return;
    }
    if (
      startDate &&
      endDate &&
      (startDate.getMonth() !== endDate.getMonth() ||
        startDate.getFullYear() !== endDate.getFullYear())
    ) {
      toast.warning(
        "Range covers multiple months. GST JSON is filed month-wise — period set from the end date.",
      );
    }
    try {
      const payload = buildGstJson();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      downloadBlob(
        blob,
        `GST_${gstType === "sales" ? "Sales" : "Purchase"}_${payload.fp}_${gstin.toUpperCase()}.json`,
      );
      toast.success("GST JSON downloaded.");
    } catch (e) {
      console.error("JSON export error:", e?.message);
      toast.error("Could not generate GST JSON.");
    }
  };

  const emptyMessage =
    !startDate || !endDate
      ? "Select a date range and tap Generate."
      : hasFetched
        ? "No records found for the selected period."
        : "Tap Generate to load the report.";

  const exportBtn =
    "h-9 px-3 shrink-0 whitespace-nowrap rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-medium";

  return (
    /*
      WIDTH FIX:
      - w-full max-w-full min-w-0  → parent flex/layout er cheye boro hote dibe na
      - [contain:inline-size]      → bhitorer min-w-[1100px] table parent ke thele boro kore dibe na
      - overflow-hidden            → shudhu table-er scroll container e horizontal scroll hobe
    */
    <div className="h-full min-h-0 w-full max-w-full min-w-0 [contain:inline-size] flex flex-col overflow-hidden bg-slate-50/40">
      {/* ---------------- HEADER + TOOLBAR (fixed height) ---------------- */}
      <div className="px-4 md:px-6 pt-3 pb-2 shrink-0 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => window.history.back()}
              className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 whitespace-nowrap">
              GST Report
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportPDF}
              disabled={!hasData || loading}
              className={`${exportBtn} text-red-600 hover:bg-red-50`}
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={exportExcel}
              disabled={!hasData || loading}
              className={`${exportBtn} text-emerald-600 hover:bg-emerald-50`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={exportJSON}
              disabled={!hasData || loading}
              title="Download GST portal JSON"
              className={`${exportBtn} text-amber-600 hover:bg-amber-50`}
            >
              <FileJson className="w-4 h-4" />
              JSON
            </button>
          </div>
        </div>

        {/* Filter toolbar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex p-1 bg-slate-100 rounded-lg shrink-0">
            {[
              { value: "sales", label: "Sales GST" },
              { value: "purchase", label: "Purchase GST" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleTypeChange(opt.value)}
                disabled={loading}
                className={`h-7 px-3 rounded-md text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                  gstType === opt.value
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 shrink-0 hidden md:block" />

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={toInputDate(startDate)}
                max={toInputDate(new Date())}
                onChange={(e) => setStartDate(parseInputDate(e.target.value))}
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
                onChange={(e) => setEndDate(parseInputDate(e.target.value))}
                className="h-9 w-[150px] pl-8 pr-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: "This Year", fn: applyThisYear },
              { label: "This Month", fn: applyThisMonth },
              { label: "Prev Month", fn: applyPreviousMonth },
            ].map(({ label, fn }) => (
              <button
                key={label}
                onClick={fn}
                disabled={loading}
                className="h-9 px-3 shrink-0 whitespace-nowrap rounded-lg border border-slate-200 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={clearDates}
            disabled={loading || (!startDate && !endDate)}
            title="Clear dates"
            className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <CalendarX2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => fetchReport(startDate, endDate, endpoint)}
            disabled={!startDate || !endDate || loading}
            className="h-9 px-4 ml-auto shrink-0 whitespace-nowrap rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[13px] font-semibold flex items-center gap-2 transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Loading..." : "Generate"}
          </button>
        </div>
      </div>

      {/* ---------------- CONTENT (no page scroll, only the table scrolls) ---------------- */}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col gap-3 px-4 md:px-6 pb-4">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mb-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : !hasData ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm text-center">
            {emptyMessage}
          </div>
        ) : (
          <>
            {/* Compact summary — same fields as mobile */}
            <div className="shrink-0 min-w-0 bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400">Range</span>
                <span className="text-[11px] text-slate-400">
                  {formattedRange}
                </span>
              </div>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2">
                <SummaryStat
                  label="Total Amount"
                  value={currency(totals.totalAmount)}
                  bold
                />
                <SummaryStat
                  label="Taxable"
                  value={currency(totals.taxableValue)}
                />
                <SummaryStat label="Count" value={String(totals.count)} />
                <SummaryStat
                  label="CGST"
                  value={currency(totals.cgst)}
                  accent="text-orange-600"
                />
                <SummaryStat
                  label="SGST"
                  value={currency(totals.sgst)}
                  accent="text-orange-600"
                />
                <SummaryStat
                  label="Total GST"
                  value={currency(totals.totalGst)}
                  accent="text-blue-600"
                  bold
                />
              </div>
            </div>

            {/* Table card → takes all remaining height, scrolls inside */}
            <div className="flex-1 min-h-0 min-w-0 max-w-full flex flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">
                  {gstType === "sales" ? "Sales" : "Purchase"} GST Entries
                </h2>
                <span className="text-xs text-slate-400">
                  {totals.count} records
                </span>
              </div>

              <div className="flex-1 min-h-0 min-w-0 w-full overflow-auto">
                <table className="w-full text-sm min-w-[1100px] border-separate border-spacing-0">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wide">
                      {[
                        ["Date", "left"],
                        [invoiceLabel, "left"],
                        [partyLabel, "left"],
                        ["GSTIN", "left"],
                        ["Item", "left"],
                        ["HSN", "left"],
                        ["Qty", "right"],
                        ["Taxable", "right"],
                        ["CGST", "right"],
                        ["SGST", "right"],
                        ["Total GST", "right"],
                        ["Amount", "right"],
                      ].map(([label, align]) => (
                        <th
                          key={label}
                          className={`sticky top-0 z-10 bg-slate-50 border-b border-slate-200 font-semibold px-4 py-2.5 whitespace-nowrap ${
                            align === "right" ? "text-right" : "text-left"
                          }`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {normalizedRows.map((r, i) => {
                      const cell = `px-4 py-2 border-t ${
                        r.isFirst && i !== 0
                          ? "border-slate-200"
                          : "border-slate-50"
                      }`;
                      return (
                        <tr
                          key={`${r.id || "row"}-${i}`}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td
                            className={`${cell} text-slate-600 whitespace-nowrap`}
                          >
                            {r.isFirst ? formatDDMMYY(r.date) : ""}
                          </td>
                          <td
                            className={`${cell} font-medium text-slate-800 whitespace-nowrap`}
                          >
                            {r.isFirst ? (
                              safe(r.invoiceNo)
                            ) : (
                              <span className="text-slate-300">↳</span>
                            )}
                          </td>
                          <td
                            className={`${cell} text-slate-700 whitespace-nowrap`}
                          >
                            {r.isFirst ? safe(r.partyName) : ""}
                          </td>
                          <td
                            className={`${cell} text-slate-500 whitespace-nowrap font-mono text-xs`}
                          >
                            {r.isFirst ? safe(r.partyGst) : ""}
                          </td>
                          <td className={`${cell} text-slate-700`}>
                            {itemLabel(r)}
                          </td>
                          <td className={`${cell} text-slate-500`}>
                            {safe(r.hsn)}
                          </td>
                          <td
                            className={`${cell} text-right text-slate-600 whitespace-nowrap`}
                          >
                            {qtyFmt(r.quantity)}
                          </td>
                          <td
                            className={`${cell} text-right text-slate-600 tabular-nums`}
                          >
                            {currency(r.taxableValue)}
                          </td>
                          <td
                            className={`${cell} text-right text-orange-600 tabular-nums`}
                          >
                            {currency(r.cgst)}
                            <div className="text-[10px] text-slate-400">
                              {r.cgstPct}%
                            </div>
                          </td>
                          <td
                            className={`${cell} text-right text-orange-600 tabular-nums`}
                          >
                            {currency(r.sgst)}
                            <div className="text-[10px] text-slate-400">
                              {r.sgstPct}%
                            </div>
                          </td>
                          <td
                            className={`${cell} text-right font-semibold text-blue-600 tabular-nums`}
                          >
                            {currency(r.totalGst)}
                          </td>
                          <td
                            className={`${cell} text-right font-semibold text-slate-800 tabular-nums`}
                          >
                            {r.isFirst ? currency(r.invoiceAmount) : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr className="font-semibold text-slate-800">
                      <td
                        colSpan={7}
                        className="sticky bottom-0 z-10 bg-slate-50 border-t-2 border-slate-300 px-4 py-2.5 text-right"
                      >
                        Total:
                      </td>
                      {[
                        totals.taxableValue,
                        totals.cgst,
                        totals.sgst,
                        totals.totalGst,
                        totals.totalAmount,
                      ].map((v, i) => (
                        <td
                          key={i}
                          className="sticky bottom-0 z-10 bg-slate-50 border-t-2 border-slate-300 px-4 py-2.5 text-right tabular-nums whitespace-nowrap"
                        >
                          {currency(v)}
                        </td>
                      ))}
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
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide truncate">
        {label}
      </div>
      <div
        className={`${bold ? "text-base" : "text-sm"} font-bold ${accent || "text-slate-800"} truncate`}
      >
        {value}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { format, isToday, isYesterday, startOfWeek, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import {
  Search,
  Phone,
  Calendar,
  Plus,
  ReceiptText,
  X,
  Loader2,
  Pencil,
  Printer,
  Download,
} from "lucide-react";

import api from "../../utils/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { generateInvoiceHTML } from "../../utils/invoiceTemplate";

const statusStyles = {
  paid: "bg-green-600 text-white",
  partial: "bg-orange-500 text-white",
  unpaid: "bg-red-500 text-white",
};

const DATE_FILTERS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
];

const STATUS_FILTERS = [
  { key: "paid", label: "Paid" },
  { key: "partial", label: "Partial" },
  { key: "unpaid", label: "Unpaid" },
];

export default function InvoiceListPage({
  refreshKey,
  onCreateNew,
  onEditInvoice,
  storedata = {},
}) {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [activePreviewNumber, setActivePreviewNumber] = useState("");
  const iframeRef = useRef(null);

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/invoice?limit=200&sort=-createdAt");
      setInvoices(res?.data?.docs || res?.data || []);
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.customerName?.toLowerCase().includes(q) ||
        inv.customerMobile?.includes(q) ||
        inv.invoiceNumber?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (dateFilter !== "all") {
        const createdAt = new Date(inv.createdAt || inv.invoiceDate);
        if (dateFilter === "today" && !isToday(createdAt)) return false;
        if (dateFilter === "yesterday" && !isYesterday(createdAt)) return false;
        if (dateFilter === "thisWeek") {
          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          if (!isWithinInterval(createdAt, { start: weekStart, end: new Date() })) return false;
        }
      }
      if (statusFilter !== "all" && inv.paymentStatus !== statusFilter) return false;
      return true;
    });
  }, [invoices, searchQuery, dateFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / limit));
  const pagedInvoices = filteredInvoices.slice((page - 1) * limit, page * limit);

  const chips = [...DATE_FILTERS, ...STATUS_FILTERS];

  const isChipActive = (chip) => {
    const isDateChip = DATE_FILTERS.some((f) => f.key === chip.key);
    if (isDateChip) return dateFilter === chip.key;
    return statusFilter === chip.key;
  };

  const handleChipClick = (chip) => {
    const isDateChip = DATE_FILTERS.some((f) => f.key === chip.key);
    if (isDateChip) {
      setDateFilter(chip.key);
    } else {
      setStatusFilter((prev) => (prev === chip.key ? "all" : chip.key));
    }
  };

  // ---------------------------------------------------------------------
  // ✅ FIXED — row click preview
  //
  // Bugs that were here before:
  // 1) invoiceData.subTotal/discountTotal/roundOff/grandTotal were never
  //    set, but generateInvoiceHTML reads them (invoiceData?.subTotal etc.)
  //    whenever createdInvoice:true → Number(undefined) → NaN → "₹NaN" /
  //    "Zero Rupees Only".
  // 2) invoiceCalculations.gstBreakdown was never set. The template does
  //    Object.entries(invoiceCalculations.gstBreakdown) unconditionally —
  //    with it undefined this throws, lands in the catch block, and the
  //    modal never opens ("failed to load invoice preview" toast).
  // 3) Cart item field-name fallbacks were too narrow (qty/rate/taxable
  //    value/gst amount showed as 0 for documents using different keys).
  // ---------------------------------------------------------------------
  const handleRowClick = async (inv) => {
    try {
      setPreviewLoadingId(inv._id);

      // ⚠️ ADJUST: replace with your real "get single invoice" endpoint if different
      const res = await api.get(`/invoice/id/${inv._id}`);
      const doc = res?.data?.data || res?.data || inv;

      const rawItems = doc.items || doc.cartItems || [];

      // ⚠️ ADJUST: widen/rename these fallbacks to match your exact backend
      // field names if qty/rate still show as 0 after this fix.
      const cartItems = rawItems.map((it) => {
        const qty = Number(it.qty ?? it.quantity ?? 0);
        const baseRate = Number(
          it.price ?? it.sellingPrice ?? it.baseRate ?? it.rate ?? it.unitPrice ?? 0,
        );
        const gstRate = Number(it.gstRate ?? 0);
        const isTaxInclusive = Boolean(it.isTaxInclusive);
        const discountType =
          it.discountType === "percentage" ? "percent" : it.discountType || "amount";
        const discount = Number(it.discount ?? 0);

        const perUnitDiscount =
          discountType === "percent" ? (baseRate * discount) / 100 : discount;

        // Prefer a persisted taxableValue; otherwise derive it.
        let taxableValue =
          it.taxableValue != null ? Number(it.taxableValue) : undefined;
        if (taxableValue === undefined) {
          let perUnitTaxable = baseRate - perUnitDiscount;
          if (isTaxInclusive && gstRate > 0) {
            perUnitTaxable = perUnitTaxable / (1 + gstRate / 100);
          }
          taxableValue = Math.max(perUnitTaxable, 0) * qty;
        }

        const gstAmount =
          it.gstAmount != null ? Number(it.gstAmount) : (taxableValue * gstRate) / 100;

        const total = it.total != null ? Number(it.total) : taxableValue + gstAmount;

        return {
          _id: it._id || it.product,
          name: it.name,
          hsn: it.hsn,
          unit: it.unit,
          qty,
          baseRate,
          price: baseRate,
          sellingPrice: baseRate,
          discount,
          discountType,
          gstRate,
          isTaxInclusive,
          mrp: Number(it.mrp ?? 0),
          taxableValue,
          gstAmount,
          total,
        };
      });

      // ⚠️ ADJUST: if your invoice doc stores these under different top-level
      // keys, point them here. gstBreakdown MUST always resolve to an object.
      const subTotal = Number(doc.invoiceCalculations?.subTotal ?? doc.subTotal ?? 0);
      const discountTotal = Number(
        doc.invoiceCalculations?.discountTotal ?? doc.discountTotal ?? doc.totalDiscount ?? 0,
      );
      const grandTotal = Number(doc.invoiceCalculations?.grandTotal ?? doc.grandTotal ?? 0);
      const roundOff = Number(doc.invoiceCalculations?.roundOff ?? doc.roundOff ?? 0);
      const gstBreakdown = doc.invoiceCalculations?.gstBreakdown || doc.gstBreakdown || {};

      const invoiceCalculations = {
        subtotal: subTotal,
        discountTotal,
        grandTotal,
        roundOff,
        gstBreakdown, // never undefined — prevents the crash that blocked the modal
        totalQuantity:
          doc.invoiceCalculations?.totalQuantity ??
          doc.totalQuantity ??
          cartItems.reduce((s, i) => s + Number(i.qty || 0), 0),
      };

      const formValues = {
        customerName: doc.customerName,
        customerMobile: doc.customerMobile,
        contactNumber: doc.customerMobile,
        customerAddress: doc.customerAddress,
        customerCity: doc.customerCity,
        customerState: doc.customerState,
        customerGstNumber: doc.customerGstNumber,
      };

      const pageFormat = storedata?.settings?.printMode === "a5" ? "a5" : "a4";
      const dateObj = new Date(doc.createdAt || doc.invoiceDate);

      const html = generateInvoiceHTML({
        preview: false,
        createdInvoice: true,
        invoiceData: {
          transactions: doc.transactions || [],
          remarks: doc.remarks || "",
          paymentMethod: doc.paymentMethod,
          paymentNote: doc.paymentNote,
          status: doc.status,
          isIgst: Boolean(doc.isIgst),
          // ✅ the fields that were missing and caused NaN / "Zero Rupees Only"
          subTotal,
          discountTotal,
          roundOff,
          grandTotal,
        },
        formValues,
        cartItems,
        invoiceCalculations,
        invoiceNumber: doc.invoiceNumber,
        currentDate: format(dateObj, "dd-MMM-yyyy"),
        currentTime: format(dateObj, "hh:mm a"),
        storedata,
        invoiceDate: dateObj,
        isGstInvoice: doc.type === "gst",
        isMrpEnabled: Boolean(doc.isMrpEnabled),
        pageFormat,
        payment: {
          paid: doc.paidAmount ?? 0,
          due: doc.dueAmount ?? 0,
          status: doc.paymentStatus ?? "unpaid",
        },
      });

      setActivePreviewNumber(doc.invoiceNumber);
      setPreviewHtml(html);
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load invoice preview");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  const handleDownload = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-${activePreviewNumber || "preview"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-3 md:p-4 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <ReceiptText className="w-4 h-4 text-blue-600" />
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900">Invoices</h1>
            <p className="text-xs text-slate-400">Manage your sales invoices</p>
          </div>
        </div>
        <Button onClick={onCreateNew} size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Invoice
        </Button>
      </div>

      {/* Search + limit */}
      <div className="flex gap-2 mb-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or invoice number…"
            className="pl-9 h-8 text-sm rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <X
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 cursor-pointer text-gray-400"
            />
          )}
        </div>

        <Select value={limit} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-[100px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((x) => (
              <SelectItem key={x} value={x}>
                {x} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2.5 no-scrollbar">
        {chips.map((chip) => {
          const active = isChipActive(chip);
          const isStatusChip = STATUS_FILTERS.some((f) => f.key === chip.key);
          return (
            <button
              key={chip.key}
              onClick={() => handleChipClick(chip)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                active
                  ? isStatusChip
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {active && <span>✓</span>}
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
          <span className="text-sm font-semibold text-slate-700">Invoices</span>
          <span className="text-xs text-slate-400">
            Showing {pagedInvoices.length} of {filteredInvoices.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading invoices...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <ReceiptText className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Invoices Found</p>
            <p className="text-xs text-slate-400 max-w-xs mt-0.5 mb-3">
              {searchQuery ? `No invoices match "${searchQuery}".` : "Start by creating your first invoice."}
            </p>
            {!searchQuery && (
              <Button onClick={onCreateNew} size="sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-1.5 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-1.5">Customer</th>
                  <th className="text-left font-semibold px-3 py-1.5">Phone</th>
                  <th className="text-left font-semibold px-3 py-1.5">Invoice #</th>
                  <th className="text-left font-semibold px-3 py-1.5">Date</th>
                  <th className="text-center font-semibold px-3 py-1.5">Status</th>
                  <th className="text-right font-semibold px-3 py-1.5">Amount</th>
                  <th className="text-center font-semibold px-3 py-1.5 w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedInvoices.map((inv, index) => (
                  <tr
                    key={inv._id}
                    onClick={() => handleRowClick(inv)}
                    className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/60 transition-colors ${
                      index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                    }`}
                  >
                    <td className="px-3 py-1.5 text-slate-400 text-xs align-middle">
                      {(page - 1) * limit + index + 1}
                    </td>

                    <td className="px-3 py-1.5 align-middle">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-slate-800 truncate">
                          {inv.customerName || "No Customer Found"}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                          {inv.type === "gst" ? "GST" : "Non-GST"}
                        </Badge>
                      </div>
                    </td>

                    <td className="px-3 py-1.5 text-slate-500 text-xs align-middle whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {inv.customerMobile || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-1.5 text-slate-700 italic font-medium text-xs align-middle whitespace-nowrap">
                      #{inv.invoiceNumber}
                    </td>

                    <td className="px-3 py-1.5 text-slate-500 text-xs align-middle whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(inv.createdAt || inv.invoiceDate), "dd MMM yyyy, hh:mm a")}
                      </span>
                    </td>

                    <td className="px-3 py-1.5 text-center align-middle">
                      <Badge
                        className={`text-[10px] capitalize ${
                          statusStyles[inv.paymentStatus] || statusStyles.unpaid
                        }`}
                      >
                        {inv.paymentStatus}
                      </Badge>
                    </td>

                    <td className="px-3 py-1.5 text-right align-middle whitespace-nowrap">
                      <span className="text-blue-600 font-bold text-xs">
                        ₹{Number(inv.grandTotal || 0).toFixed(2)}
                      </span>
                    </td>

                    <td
                      className="px-3 py-1.5 text-center align-middle whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => onEditInvoice(inv._id)}
                      >
                        {previewLoadingId === inv._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && filteredInvoices.length > 0 && (
        <div className="flex justify-between items-center mt-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl w-full h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b shrink-0 flex flex-row items-center justify-between pr-10 space-y-0">
            <DialogTitle>Invoice Preview {activePreviewNumber ? `#${activePreviewNumber}` : ""}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </Button>
            </div>
          </DialogHeader>
          <iframe
            ref={iframeRef}
            title="invoice-preview"
            srcDoc={previewHtml}
            className="flex-1 w-full border-0 bg-white"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
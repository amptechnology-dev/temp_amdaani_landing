"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { format, isToday, isYesterday, isWithinInterval, subDays } from "date-fns";
import {
  Search,
  Plus,
  Phone,
  Calendar,
  Truck,
  X,
  Loader2,
  Pencil,
  Printer,
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

import { generatePurchaseHTML } from "../../utils/purchaseTemplate";

const statusStyles = {
  paid: "bg-green-600 hover:bg-green-600 text-white",
  partial: "bg-orange-500 hover:bg-orange-500 text-white",
  unpaid: "bg-red-500 hover:bg-red-500 text-white",
};

const DATE_FILTERS = ["All", "Today", "Yesterday", "This Week"];
const STATUS_FILTERS = ["All", "Paid", "Partial", "Unpaid"];

export default function PurchaseListPage({ refreshKey, onCreateNew, onEditPurchase }) {
  // ⚠️ ADJUST: change `storedata` below to whatever key your AuthContext
  // actually exposes (e.g. `store`, `storeData`, `currentStore`).
  const auth = useAuth();
  const contextStoredata = auth?.storedata || auth?.store || auth?.storeData || null;

  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storedata, setStoredata] = useState(contextStoredata || {});
  const [storeLoading, setStoreLoading] = useState(!contextStoredata);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [activePreviewNumber, setActivePreviewNumber] = useState("");
  const iframeRef = useRef(null);

  useEffect(() => {
    fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // ✅ Keep in sync if AuthContext resolves store data after mount
  useEffect(() => {
    if (contextStoredata && Object.keys(contextStoredata).length > 0) {
      setStoredata(contextStoredata);
      setStoreLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextStoredata]);

  // ✅ Fallback — only fetches if AuthContext didn't already provide store data.
  useEffect(() => {
    if (contextStoredata && Object.keys(contextStoredata).length > 0) return;

    const fetchStore = async () => {
      setStoreLoading(true);
      try {
        // ⚠️ ADJUST: confirm this matches the exact endpoint that returns
        // your store JSON (name, logoUrl, bankDetails, gstNumber, etc.)
        const res = await api.get("/store");
        const doc = res?.data?.data || res?.data;
        if (doc && typeof doc === "object") {
          setStoredata(doc);
        } else {
          console.error("Store API returned unexpected shape:", res?.data);
        }
      } catch (err) {
        console.error("Failed to fetch store data:", err);
        toast.error("Couldn't load store details for purchase preview");
      } finally {
        setStoreLoading(false);
      }
    };

    fetchStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextStoredata]);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/purchase?limit=200&sort=-createdAt");
      setPurchases(res?.data?.docs || res?.data || []);
    } catch {
      toast.error("Failed to load purchases");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    let list = [...purchases];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.vendorName?.toLowerCase().includes(q) ||
          p.vendorMobile?.toLowerCase().includes(q) ||
          p.invoiceNumber?.toLowerCase().includes(q)
      );
    }

    if (dateFilter !== "All") {
      list = list.filter((p) => {
        const d = new Date(p.date || p.createdAt);
        if (dateFilter === "Today") return isToday(d);
        if (dateFilter === "Yesterday") return isYesterday(d);
        if (dateFilter === "This Week")
          return isWithinInterval(d, { start: subDays(new Date(), 7), end: new Date() });
        return true;
      });
    }

    if (statusFilter !== "All") {
      list = list.filter(
        (p) => (p.paymentStatus || "unpaid").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    return list;
  }, [purchases, searchTerm, dateFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, dateFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / limit));
  const pagedPurchases = filteredPurchases.slice((page - 1) * limit, page * limit);

  const chips = [
    ...DATE_FILTERS.map((f) => ({ kind: "date", label: f })),
    ...STATUS_FILTERS.filter((f) => f !== "All").map((f) => ({ kind: "status", label: f })),
  ];

  const isChipActive = (chip) => {
    if (chip.kind === "date") return dateFilter === chip.label;
    if (chip.kind === "status") return statusFilter === chip.label;
    return false;
  };

  const handleChipClick = (chip) => {
    if (chip.kind === "date") {
      setDateFilter((prev) => (prev === chip.label ? "All" : chip.label));
    } else if (chip.kind === "status") {
      setStatusFilter((prev) => (prev === chip.label ? "All" : chip.label));
    }
  };

  const handleRowClick = async (p) => {
    if (storeLoading) {
      toast.info("Store details are still loading, try again in a moment");
      return;
    }

    try {
      setPreviewLoadingId(p._id);

      // ⚠️ ADJUST: replace with your real "get single purchase" endpoint if different
      const res = await api.get(`/purchase/id/${p._id}`);
      const doc = res?.data?.data || res?.data || p;

      const rawItems = doc.items || doc.cartItems || [];

      // ⚠️ ADJUST: widen/rename these fallbacks to match your exact backend
      // field names if qty/rate still show as 0 after this fix.
      const cartItems = rawItems.map((it) => {
        const qty = Number(it.qty ?? it.quantity ?? 0);
        const costPrice = Number(
          it.costPrice ?? it.rate ?? it.price ?? it.purchasePrice ?? 0,
        );
        const gstRate = Number(it.gstRate ?? 0);
        const isPurchaseTaxInclusive = Boolean(it.isPurchaseTaxInclusive);
        const purchaseDiscountType = it.purchaseDiscountType || it.discountType || "amount";
        const purchaseDiscount = Number(it.purchaseDiscount ?? it.discount ?? 0);

        const perUnitDiscount =
          purchaseDiscountType === "percentage"
            ? (costPrice * purchaseDiscount) / 100
            : purchaseDiscount;

        let taxableValue =
          it.taxableValue != null ? Number(it.taxableValue) : undefined;
        if (taxableValue === undefined) {
          let perUnitTaxable = costPrice - perUnitDiscount;
          if (isPurchaseTaxInclusive && gstRate > 0) {
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
          costPrice,
          isPurchaseTaxInclusive,
          purchaseDiscount,
          purchaseDiscountType,
          gstRate,
          mrp: Number(it.mrp ?? 0),
          taxableValue,
          gstAmount,
          total,
        };
      });

      // ⚠️ ADJUST: if your purchase doc stores these under different top-level
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
        netTotal: grandTotal,
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
        vendorName: doc.vendorName,
        vendorMobile: doc.vendorMobile,
        contactNumber: doc.vendorMobile,
        vendorAddress: doc.vendorAddress,
        vendorCity: doc.vendorCity,
        vendorState: doc.vendorState,
        vendorGstNumber: doc.vendorGstNumber,
      };

      const pageFormat = storedata?.settings?.printMode === "a5" ? "a5" : "a4";
      const dateObj = new Date(doc.createdAt || doc.date);

      const html = generatePurchaseHTML({
        preview: false,
        createdInvoice: true,
        invoiceData: {
          paymentMethod: doc.paymentMethod,
          paymentNote: doc.paymentNote,
          transactions: doc.transactions || [],
          remarks: doc.remarks || "",
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
        storedata, // ✅ now guaranteed to be populated (context or fallback fetch)
        invoiceDate: dateObj,
        isGstInvoice: Boolean(doc.vendorGstNumber),
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
      toast.error("Failed to load purchase preview");
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
    a.download = `Purchase-${activePreviewNumber || "preview"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-3 md:p-4 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900">Purchases</h1>
          <p className="text-xs text-slate-400">Manage your vendor purchases</p>
        </div>
        <Button onClick={onCreateNew} size="sm">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Purchase
        </Button>
      </div>

      {/* Search + limit */}
      <div className="flex gap-2 mb-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or invoice number…"
            className="pl-9 h-8 text-sm rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <X
              onClick={() => setSearchTerm("")}
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
          return (
            <button
              key={`${chip.kind}-${chip.label}`}
              onClick={() => handleChipClick(chip)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                active
                  ? chip.kind === "status"
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
          <span className="text-sm font-semibold text-slate-700">Purchases</span>
          <span className="text-xs text-slate-400">
            Showing {pagedPurchases.length} of {filteredPurchases.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading purchases...
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Truck className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Purchases Found</p>
            <p className="text-xs text-slate-400 max-w-xs mt-0.5 mb-3">
              {searchTerm ? `No purchases match "${searchTerm}".` : "Start by creating your first purchase."}
            </p>
            {!searchTerm && (
              <Button onClick={onCreateNew} size="sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Purchase
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-1.5 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-1.5">Vendor</th>
                  <th className="text-left font-semibold px-3 py-1.5">Phone</th>
                  <th className="text-left font-semibold px-3 py-1.5">Invoice #</th>
                  <th className="text-left font-semibold px-3 py-1.5">Date</th>
                  <th className="text-center font-semibold px-3 py-1.5">Status</th>
                  <th className="text-right font-semibold px-3 py-1.5">Amount</th>
                  <th className="text-center font-semibold px-3 py-1.5 w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedPurchases.map((p, index) => (
                  <tr
                    key={p._id}
                    onClick={() => handleRowClick(p)}
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
                          {p.vendorName || "No Vendor"}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                          {p.vendorGstNumber ? "GST" : "Non-GST"}
                        </Badge>
                      </div>
                    </td>

                    <td className="px-3 py-1.5 text-slate-500 text-xs align-middle whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {p.vendorMobile || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-1.5 text-blue-600 italic font-medium text-xs align-middle whitespace-nowrap">
                      #{p.invoiceNumber}
                    </td>

                    <td className="px-3 py-1.5 text-slate-500 text-xs align-middle whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(p.createdAt || p.date), "dd MMM yyyy, hh:mm a")}
                      </span>
                    </td>

                    <td className="px-3 py-1.5 text-center align-middle">
                      <Badge
                        className={`text-[10px] capitalize ${
                          statusStyles[p.paymentStatus] || statusStyles.unpaid
                        }`}
                      >
                        {p.paymentStatus || "unpaid"}
                      </Badge>
                    </td>

                    <td className="px-3 py-1.5 text-right align-middle whitespace-nowrap">
                      <span className="text-blue-600 font-semibold text-xs">
                        ₹{Number(p.grandTotal || 0).toLocaleString("en-IN")}
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
                        onClick={() => onEditPurchase(p._id)}
                      >
                        {previewLoadingId === p._id ? (
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
      {!isLoading && filteredPurchases.length > 0 && (
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
            <DialogTitle>Purchase Preview {activePreviewNumber ? `#${activePreviewNumber}` : ""}</DialogTitle>
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
            title="purchase-preview"
            srcDoc={previewHtml}
            className="flex-1 w-full border-0 bg-white"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
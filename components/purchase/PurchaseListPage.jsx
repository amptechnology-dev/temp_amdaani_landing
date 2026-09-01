"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  format,
  isToday,
  isYesterday,
  isWithinInterval,
  subDays,
} from "date-fns";
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
  MessageCircle,
  Download,
  Ban,
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

import { generatePurchaseHTML } from "../../utils/purchaseTemplate";

const statusStyles = {
  paid: "bg-green-600 hover:bg-green-600 text-white",
  partial: "bg-orange-500 hover:bg-orange-500 text-white",
  unpaid: "bg-red-500 hover:bg-red-500 text-white",
  // ✅ NEW — cancelled purchases get their own neutral badge color
  cancelled: "bg-slate-500 hover:bg-slate-500 text-white",
};

const DATE_FILTERS = ["All", "Today", "Yesterday", "This Week"];
const STATUS_FILTERS = ["All", "Paid", "Partial", "Unpaid"];

export default function PurchaseListPage({
  refreshKey,
  onCreateNew,
  onEditPurchase,
}) {
  const auth = useAuth();
  const contextStoredata =
    auth?.storedata || auth?.store || auth?.storeData || null;

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
  const [activePreviewMeta, setActivePreviewMeta] = useState({
    vendorName: "",
    vendorMobile: "",
    grandTotal: 0,
  });

  // ✅ NEW — track which purchase is currently open in preview, and its
  // current status, so the Edit/Cancel buttons in the dialog know what
  // to act on.
  const [activePreviewId, setActivePreviewId] = useState(null);
  const [activePreviewStatus, setActivePreviewStatus] = useState("active");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef(null);

  const pageFormat = storedata?.settings?.printMode === "a5" ? "a5" : "a4";

  useEffect(() => {
    fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    if (contextStoredata && Object.keys(contextStoredata).length > 0) {
      setStoredata(contextStoredata);
      setStoreLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextStoredata]);

  useEffect(() => {
    if (contextStoredata && Object.keys(contextStoredata).length > 0) return;

    const fetchStore = async () => {
      setStoreLoading(true);
      try {
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

  // ✅ NEW — cancelled purchases show "cancelled" in the status column
  // regardless of their paymentStatus (paid/partial/unpaid).
  const getDisplayStatus = (p) =>
    (p.status || "").toLowerCase() === "cancelled"
      ? "cancelled"
      : (p.paymentStatus || "unpaid").toLowerCase();

  const filteredPurchases = useMemo(() => {
    let list = [...purchases];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.vendorName?.toLowerCase().includes(q) ||
          p.vendorMobile?.toLowerCase().includes(q) ||
          p.invoiceNumber?.toLowerCase().includes(q),
      );
    }

    if (dateFilter !== "All") {
      list = list.filter((p) => {
        const d = new Date(p.date || p.createdAt);
        if (dateFilter === "Today") return isToday(d);
        if (dateFilter === "Yesterday") return isYesterday(d);
        if (dateFilter === "This Week")
          return isWithinInterval(d, {
            start: subDays(new Date(), 7),
            end: new Date(),
          });
        return true;
      });
    }

    if (statusFilter !== "All") {
      list = list.filter(
        (p) =>
          (p.paymentStatus || "unpaid").toLowerCase() ===
          statusFilter.toLowerCase(),
      );
    }

    return list;
  }, [purchases, searchTerm, dateFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, dateFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / limit));
  const pagedPurchases = filteredPurchases.slice(
    (page - 1) * limit,
    page * limit,
  );

  const chips = [
    ...DATE_FILTERS.map((f) => ({ kind: "date", label: f })),
    ...STATUS_FILTERS.filter((f) => f !== "All").map((f) => ({
      kind: "status",
      label: f,
    })),
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
      setActivePreviewId(p._id); // ✅ NEW

      const res = await api.get(`/purchase/id/${p._id}`);
      const doc = res?.data?.data || res?.data || p;

      // ✅ NEW — remember current status for the Edit/Cancel buttons
      setActivePreviewStatus((doc.status || "active").toLowerCase());

      const rawItems = doc.items || doc.cartItems || [];

      const cartItems = rawItems.map((it) => {
        const qty = Number(it.qty ?? it.quantity ?? 0);
        const costPrice = Number(
          it.costPrice ?? it.rate ?? it.price ?? it.purchasePrice ?? 0,
        );
        const gstRate = Number(it.gstRate ?? 0);
        const isPurchaseTaxInclusive = Boolean(it.isPurchaseTaxInclusive);
        const purchaseDiscountType =
          it.purchaseDiscountType || it.discountType || "amount";
        const purchaseDiscount = Number(
          it.purchaseDiscount ?? it.discount ?? 0,
        );

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
          it.gstAmount != null
            ? Number(it.gstAmount)
            : (taxableValue * gstRate) / 100;

        const total =
          it.total != null ? Number(it.total) : taxableValue + gstAmount;

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

      const subTotal = Number(
        doc.invoiceCalculations?.subTotal ?? doc.subTotal ?? 0,
      );
      const discountTotal = Number(
        doc.invoiceCalculations?.discountTotal ??
          doc.discountTotal ??
          doc.totalDiscount ??
          0,
      );
      const grandTotal = Number(
        doc.invoiceCalculations?.grandTotal ?? doc.grandTotal ?? 0,
      );
      const roundOff = Number(
        doc.invoiceCalculations?.roundOff ?? doc.roundOff ?? 0,
      );
      const gstBreakdown =
        doc.invoiceCalculations?.gstBreakdown || doc.gstBreakdown || {};

      const invoiceCalculations = {
        subtotal: subTotal,
        netTotal: grandTotal,
        discountTotal,
        grandTotal,
        roundOff,
        gstBreakdown,
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
      setActivePreviewMeta({
        vendorName: doc.vendorName || "",
        vendorMobile: doc.vendorMobile || "",
        grandTotal,
      });
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

  const toDataURL = async (url) => {
    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Image fetch failed, keeping original src:", url, err);
      return null;
    }
  };

  const inlineImagesAsBase64 = async (doc) => {
    const imgs = Array.from(doc.querySelectorAll("img"));
    await Promise.all(
      imgs.map(async (img) => {
        const src = img.getAttribute("src");
        if (!src || src.startsWith("data:")) return;
        const dataUrl = await toDataURL(src);
        if (dataUrl) img.src = dataUrl;
      }),
    );
  };

  const waitForImagesToLoad = (doc) => {
    const imgs = Array.from(doc.querySelectorAll("img"));
    return Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      }),
    );
  };

  const generatePdfBlob = async () => {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);

    const idoc = iframeRef.current?.contentDocument;
    if (!idoc || !idoc.body) {
      throw new Error("Preview not ready yet");
    }

    await inlineImagesAsBase64(idoc);
    await waitForImagesToLoad(idoc);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(idoc.body, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      windowWidth: idoc.documentElement.scrollWidth,
      windowHeight: idoc.documentElement.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    const pdf = new jsPDF({
      unit: "mm",
      format: pageFormat === "a5" ? "a5" : "a4",
      orientation: "portrait",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    return pdf.output("blob");
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadClick = async () => {
    try {
      setIsDownloading(true);
      const blob = await generatePdfBlob();
      const filename = `Purchase-${activePreviewNumber}.pdf`;
      downloadBlob(blob, filename);
      toast.success("Purchase PDF download successfully");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("PDF download korte problem hoyeche");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    const phoneDigits = (activePreviewMeta.vendorMobile || "").replace(
      /\D/g,
      "",
    );

    if (!phoneDigits) {
      toast.error("Ei bill-e vendor-er phone number pawa jayni");
      return;
    }

    try {
      setSendingWhatsApp(true);
      const blob = await generatePdfBlob();
      const filename = `Purchase-${activePreviewNumber}.pdf`;
      const message = `Hello ${
        activePreviewMeta.vendorName || "Vendor"
      },\nHere is the purchase invoice #${activePreviewNumber}.\nTotal Amount: ₹${
        activePreviewMeta.grandTotal ?? 0
      }`;
      const waNumber =
        phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;

      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Purchase Invoice #${activePreviewNumber}`,
          text: message,
        });
        return;
      }

      downloadBlob(blob, filename);
      toast.success("Purchase PDF download hoyeche — WhatsApp-e attach kore dao");
      window.open(
        `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`,
        "_blank",
      );
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("WhatsApp share error:", err);
        toast.error("WhatsApp-e pathano failed");
      }
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // ✅ NEW — jump straight into the edit form (same flow as the row's
  // "Edit" button) directly from inside the preview dialog.
  const handleEditFromPreview = () => {
    if (!activePreviewId) return;
    setPreviewOpen(false);
    onEditPurchase(activePreviewId);
  };

  // ✅ NEW — Cancel purchase. Opens a confirmation dialog first; the actual
  // API call happens in handleConfirmCancelPurchase.
  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancelPurchase = async () => {
    if (!activePreviewId) return;
    try {
      setIsCancelling(true);
      // ⚠️ ADJUST: if your purchase status-change schema expects a different
      // body field name than `status`, update the key below to match.
      await api.put(`/purchase/status/${activePreviewId}`, {
        status: "cancelled",
      });
      toast.success("Purchase cancelled successfully");
      setShowCancelConfirm(false);
      setPreviewOpen(false);
      await fetchPurchases();
    } catch (err) {
      console.error("Cancel purchase failed:", err);
      toast.error("Failed to cancel purchase");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-4 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Purchases
          </h1>
          <p className="text-sm text-slate-400">Manage your vendor purchases</p>
        </div>
        <Button onClick={onCreateNew} size="sm" className="text-sm h-9 px-4">
          <Plus className="w-4 h-4 mr-1.5" />
          New Purchase
        </Button>
      </div>

      {/* Search + limit */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or invoice number…"
            className="pl-9 h-9 text-sm rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <X
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer text-gray-400"
            />
          )}
        </div>

        <Select value={limit} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-[110px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((x) => (
              <SelectItem key={x} value={x} className="text-sm">
                {x} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar">
        {chips.map((chip) => {
          const active = isChipActive(chip);
          return (
            <button
              key={`${chip.kind}-${chip.label}`}
              onClick={() => handleChipClick(chip)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
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
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="text-base font-semibold text-slate-700">
            Purchases
          </span>
          <span className="text-sm text-slate-400">
            Showing {pagedPurchases.length} of {filteredPurchases.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading purchases...
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Truck className="w-11 h-11 text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">
              No Purchases Found
            </p>
            <p className="text-sm text-slate-400 max-w-xs mt-0.5 mb-3">
              {searchTerm
                ? `No purchases match "${searchTerm}".`
                : "Start by creating your first purchase."}
            </p>
            {!searchTerm && (
              <Button onClick={onCreateNew} size="sm" className="text-sm h-9">
                <Plus className="w-4 h-4 mr-1.5" />
                New Purchase
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left font-semibold px-3 py-2 w-8">#</th>
                  <th className="text-left font-semibold px-3 py-2">
                    Vendor
                  </th>
                  <th className="text-left font-semibold px-3 py-2">Phone</th>
                  <th className="text-left font-semibold px-3 py-2">
                    Invoice #
                  </th>
                  <th className="text-left font-semibold px-3 py-2">Date</th>
                  <th className="text-center font-semibold px-3 py-2">
                    Status
                  </th>
                  <th className="text-right font-semibold px-3 py-2">
                    Amount
                  </th>
                  <th className="text-center font-semibold px-3 py-2 w-20">
                    Action
                  </th>
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
                    <td className="px-3 py-2 text-slate-400 text-sm align-middle">
                      {(page - 1) * limit + index + 1}
                    </td>

                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-slate-800 truncate text-sm">
                          {p.vendorName || "No Vendor"}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0.5 shrink-0"
                        >
                          {p.vendorGstNumber ? "GST" : "Non-GST"}
                        </Badge>
                      </div>
                    </td>

                    <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {p.vendorMobile || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-blue-600 italic font-medium text-sm align-middle whitespace-nowrap">
                      #{p.invoiceNumber}
                    </td>

                    <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(
                          new Date(p.createdAt || p.date),
                          "dd MMM yyyy, hh:mm a",
                        )}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-center align-middle">
                      <Badge
                        className={`text-[11px] capitalize ${
                          statusStyles[getDisplayStatus(p)] ||
                          statusStyles.unpaid
                        }`}
                      >
                        {getDisplayStatus(p)}
                      </Badge>
                    </td>

                    <td className="px-3 py-2 text-right align-middle whitespace-nowrap">
                      <span className="text-blue-600 font-semibold text-sm">
                        ₹{Number(p.grandTotal || 0).toLocaleString("en-IN")}
                      </span>
                    </td>

                    <td
                      className="px-3 py-2 text-center align-middle whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-sm"
                        onClick={() => onEditPurchase(p._id)}
                      >
                        {previewLoadingId === p._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Pencil className="w-3.5 h-3.5 mr-1" />
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
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-sm h-9"
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
            <DialogTitle className="flex items-center gap-2">
              Purchase Preview{" "}
              {activePreviewNumber ? `#${activePreviewNumber}` : ""}
              {activePreviewStatus === "cancelled" && (
                <Badge className="text-[10px] bg-slate-500 text-white">
                  Cancelled
                </Badge>
              )}
            </DialogTitle>
            <div className="flex gap-2 flex-wrap justify-end">
              {/* ✅ NEW — Edit button: closes preview, opens NewPurchaseFormPage in edit mode */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditFromPreview}
                className="text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>

              {/* ✅ NEW — Cancel purchase button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelClick}
                disabled={activePreviewStatus === "cancelled"}
                className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5 mr-1.5" />
                {activePreviewStatus === "cancelled"
                  ? "Cancelled"
                  : "Cancel Purchase"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                )}
                Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleWhatsAppShare}
                disabled={sendingWhatsApp}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                {sendingWhatsApp ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                )}
                WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print
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

      {/* ✅ NEW — Cancel confirmation dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              Purchase #{activePreviewNumber} will be marked as cancelled.
              This action can affect reports and cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Keep Purchase
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancelPurchase}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Yes, Cancel Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  format,
  isToday,
  isYesterday,
  startOfWeek,
  isWithinInterval,
} from "date-fns";
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
  MessageCircle,
  Download,
  Ban,
} from "lucide-react";

import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
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

import { generateInvoiceHTML } from "../../utils/invoiceTemplate";
import { generateThermalInvoiceHTML } from "../../utils/generateThermalInvoiceHTML"; // ✅ NEW

const statusStyles = {
  paid: "bg-green-600 text-white",
  partial: "bg-orange-500 text-white",
  unpaid: "bg-red-500 text-white",
  cancelled: "bg-slate-500 text-white",
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
}) {
  const auth = useAuth();
  const contextStoredata =
    auth?.storedata || auth?.store || auth?.storeData || null;

  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storedata, setStoredata] = useState(contextStoredata || {});
  const [storeLoading, setStoreLoading] = useState(!contextStoredata);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [activePreviewNumber, setActivePreviewNumber] = useState("");
  const [activePreviewMeta, setActivePreviewMeta] = useState({
    customerName: "",
    customerMobile: "",
    grandTotal: 0,
  });

  const [activePreviewId, setActivePreviewId] = useState(null);
  const [activePreviewStatus, setActivePreviewStatus] = useState("active");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef(null);
  const thermalIframeRef = useRef(null); // ✅ NEW — hidden iframe for thermal print
  const thermalPayloadRef = useRef(null); // ✅ NEW — holds raw data needed to rebuild thermal HTML on demand

  const pageFormat = storedata?.settings?.printMode === "a5" ? "a5" : "a4";

  useEffect(() => {
    fetchInvoices();
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
        toast.error("Couldn't load store details for invoice preview");
      } finally {
        setStoreLoading(false);
      }
    };

    fetchStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextStoredata]);

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

  const getDisplayStatus = (inv) =>
    (inv.status || "").toLowerCase() === "cancelled"
      ? "cancelled"
      : inv.paymentStatus;

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
          if (
            !isWithinInterval(createdAt, { start: weekStart, end: new Date() })
          )
            return false;
        }
      }
      if (statusFilter !== "all" && inv.paymentStatus !== statusFilter)
        return false;
      return true;
    });
  }, [invoices, searchQuery, dateFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / limit));
  const pagedInvoices = filteredInvoices.slice(
    (page - 1) * limit,
    page * limit,
  );

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

  const handleRowClick = async (inv) => {
    if (storeLoading) {
      toast.info("Store details are still loading, try again in a moment");
      return;
    }

    try {
      setPreviewLoadingId(inv._id);
      setActivePreviewId(inv._id);

      const res = await api.get(`/invoice/id/${inv._id}`);
      const doc = res?.data?.data || res?.data || inv;

      setActivePreviewStatus((doc.status || "active").toLowerCase());

      const rawItems = doc.items || doc.cartItems || [];

      const cartItems = rawItems.map((it) => {
        const qty = Number(it.qty ?? it.quantity ?? 0);
        const baseRate = Number(
          it.price ??
            it.sellingPrice ??
            it.baseRate ??
            it.rate ??
            it.unitPrice ??
            0,
        );
        const gstRate = Number(it.gstRate ?? 0);
        const isTaxInclusive = Boolean(it.isTaxInclusive);
        const discountType =
          it.discountType === "percentage"
            ? "percent"
            : it.discountType || "amount";
        const discount = Number(it.discount ?? 0);

        const perUnitDiscount =
          discountType === "percent" ? (baseRate * discount) / 100 : discount;

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

      const isIgstDoc = Boolean(doc.isIgst);
      const computedGstBreakdown = {};

      cartItems.forEach((item) => {
        const rate = item.gstRate || 0;
        if (rate <= 0) return;

        if (!computedGstBreakdown[rate]) {
          computedGstBreakdown[rate] = {
            taxableAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            totalGst: 0,
          };
        }

        computedGstBreakdown[rate].taxableAmount += item.taxableValue;
        computedGstBreakdown[rate].cgstAmount += isIgstDoc
          ? 0
          : item.gstAmount / 2;
        computedGstBreakdown[rate].sgstAmount += isIgstDoc
          ? 0
          : item.gstAmount / 2;
        computedGstBreakdown[rate].igstAmount += isIgstDoc
          ? item.gstAmount
          : 0;
        computedGstBreakdown[rate].totalGst += item.gstAmount;
      });

      const storedGstBreakdown =
        doc.invoiceCalculations?.gstBreakdown || doc.gstBreakdown || {};
      const gstBreakdown =
        Object.keys(storedGstBreakdown).length > 0
          ? storedGstBreakdown
          : computedGstBreakdown;

      const invoiceCalculations = {
        subtotal: subTotal,
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
        customerName: doc.customerName,
        customerMobile: doc.customerMobile,
        contactNumber: doc.customerMobile,
        customerAddress: doc.customerAddress,
        customerCity: doc.customerCity,
        customerState: doc.customerState,
        customerGstNumber: doc.customerGstNumber,
      };

      const dateObj = new Date(doc.createdAt || doc.invoiceDate);

      // ✅ NEW — stash everything needed to build the thermal HTML later
      // (Thermal Print button is clicked on-demand, after preview is open)
      thermalPayloadRef.current = {
        doc,
        cartItems,
        invoiceCalculations,
        formValues,
        dateObj,
      };

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
      setActivePreviewMeta({
        customerName: doc.customerName || "",
        customerMobile: doc.customerMobile || "",
        grandTotal,
      });
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

  // ✅ NEW — Thermal (USB-connected) print, same pattern as InvoiceSummary.js
  const handleThermalPrint = () => {
    const payload = thermalPayloadRef.current;
    if (!payload) {
      toast.error("Invoice data not ready yet, try again");
      return;
    }
    const { doc, cartItems, invoiceCalculations, formValues, dateObj } =
      payload;

    const html = generateThermalInvoiceHTML({
      createdInvoice: true,
      invoiceData: {
        transactions: doc.transactions || [],
        remarks: doc.remarks || "",
        paymentMethod: doc.paymentMethod,
        paymentNote: doc.paymentNote,
        status: doc.status,
        isIgst: Boolean(doc.isIgst),
        subTotal: invoiceCalculations.subtotal,
        discountTotal: invoiceCalculations.discountTotal,
        roundOff: invoiceCalculations.roundOff,
        grandTotal: invoiceCalculations.grandTotal,
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
      // ⚠️ ADJUST: pull the real plan flag from storedata if you track it there
      isFreePlan: storedata?.isFreePlan ?? true,
      payment: {
        paid: doc.paidAmount ?? 0,
        due: doc.dueAmount ?? 0,
        status: doc.paymentStatus ?? "unpaid",
      },
    });

    const iframe = thermalIframeRef.current;
    if (!iframe) return;

    const idoc = iframe.contentDocument || iframe.contentWindow.document;
    idoc.open();
    idoc.write(html);
    idoc.close();

    const triggerPrint = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
    iframe.onload = () => setTimeout(triggerPrint, 150);
    setTimeout(triggerPrint, 600);
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
      const filename = `Invoice-${activePreviewNumber}.pdf`;
      downloadBlob(blob, filename);
      toast.success("Invoice PDF download successfully");
    } catch (err) {
      console.error("Download error:", err);
      toast.error("PDF download korte problem hoyeche");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    const phoneDigits = (activePreviewMeta.customerMobile || "").replace(
      /\D/g,
      "",
    );

    if (!phoneDigits) {
      toast.error("Ei bill-e customer-er phone number pawa jayni");
      return;
    }

    try {
      setSendingWhatsApp(true);
      const blob = await generatePdfBlob();
      const filename = `Invoice-${activePreviewNumber}.pdf`;
      const message = `Hello ${
        activePreviewMeta.customerName || "Customer"
      },\nHere is your invoice #${activePreviewNumber}.\nThank you for your business!\nTotal Amount: ₹${
        activePreviewMeta.grandTotal ?? 0
      }`;
      const waNumber =
        phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;

      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${activePreviewNumber}`,
          text: message,
        });
        return;
      }

      downloadBlob(blob, filename);
      toast.success("Invoice PDF download successfully");
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

  const handleEditFromPreview = () => {
    if (!activePreviewId) return;
    setPreviewOpen(false);
    onEditInvoice(activePreviewId);
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancelInvoice = async () => {
    if (!activePreviewId) return;
    try {
      setIsCancelling(true);
      await api.put(`/invoice/status/${activePreviewId}`, {
        status: "cancelled",
      });
      toast.success("Invoice cancelled successfully");
      setShowCancelConfirm(false);
      setPreviewOpen(false);
      await fetchInvoices();
    } catch (err) {
      console.error("Cancel invoice failed:", err);
      toast.error("Failed to cancel invoice");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-4 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              Invoices
            </h1>
            <p className="text-sm text-slate-400">Manage your sales invoices</p>
          </div>
        </div>
        <Button onClick={onCreateNew} size="sm" className="text-sm h-9 px-4">
          <Plus className="w-4 h-4 mr-1.5" />
          New Invoice
        </Button>
      </div>

      {/* Search + limit */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or invoice number…"
            className="pl-9 h-9 text-sm rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <X
              onClick={() => setSearchQuery("")}
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
          const isStatusChip = STATUS_FILTERS.some((f) => f.key === chip.key);
          return (
            <button
              key={chip.key}
              onClick={() => handleChipClick(chip)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
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
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="text-base font-semibold text-slate-700">Invoices</span>
          <span className="text-sm text-slate-400">
            Showing {pagedInvoices.length} of {filteredInvoices.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading invoices...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <ReceiptText className="w-11 h-11 text-slate-300 mb-2" />
            <p className="text-base font-semibold text-slate-700">
              No Invoices Found
            </p>
            <p className="text-sm text-slate-400 max-w-xs mt-0.5 mb-3">
              {searchQuery
                ? `No invoices match "${searchQuery}".`
                : "Start by creating your first invoice."}
            </p>
            {!searchQuery && (
              <Button onClick={onCreateNew} size="sm" className="text-sm h-9">
                <Plus className="w-4 h-4 mr-1.5" />
                New Invoice
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
                    Customer
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
                {pagedInvoices.map((inv, index) => (
                  <tr
                    key={inv._id}
                    onClick={() => handleRowClick(inv)}
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
                          {inv.customerName || "No Customer Found"}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0.5 shrink-0"
                        >
                          {inv.type === "gst" ? "GST" : "Non-GST"}
                        </Badge>
                      </div>
                    </td>

                    <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {inv.customerMobile || "-"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-slate-700 italic font-medium text-sm align-middle whitespace-nowrap">
                      #{inv.invoiceNumber}
                    </td>

                    <td className="px-3 py-2 text-slate-500 text-sm align-middle whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(
                          new Date(inv.createdAt || inv.invoiceDate),
                          "dd MMM yyyy, hh:mm a",
                        )}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-center align-middle">
                      <Badge
                        className={`text-[11px] capitalize ${
                          statusStyles[getDisplayStatus(inv)] ||
                          statusStyles.unpaid
                        }`}
                      >
                        {getDisplayStatus(inv)}
                      </Badge>
                    </td>

                    <td className="px-3 py-2 text-right align-middle whitespace-nowrap">
                      <span className="text-blue-600 font-bold text-sm">
                        ₹{Number(inv.grandTotal || 0).toFixed(2)}
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
                        onClick={() => onEditInvoice(inv._id)}
                      >
                        {previewLoadingId === inv._id ? (
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
      {!isLoading && filteredInvoices.length > 0 && (
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

      {/* ✅ REDESIGNED — bigger dialog, title on its own row, buttons
          wrap cleanly below, content sits in a gray "viewer" frame like
          a PDF opened from email/Drive */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl w-full h-[92vh] p-0 flex flex-col overflow-hidden gap-0">
          <DialogHeader className="px-5 py-3 border-b shrink-0 space-y-2.5">
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg font-semibold text-slate-800">
              <span>Invoice Number :</span>
              {activePreviewNumber && (
                <span className="text-slate-500 font-normal">
                  #{activePreviewNumber}
                </span>
              )}
              {activePreviewStatus === "cancelled" && (
                <Badge className="text-[10px] bg-slate-500 text-white">
                  Cancelled
                </Badge>
              )}
            </DialogTitle>

            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditFromPreview}
                className="text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>

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
                  : "Cancel Invoice"}
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

              {/* ✅ NEW — Thermal Print, same as InvoiceSummary.js */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleThermalPrint}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Thermal Print
              </Button>
            </div>
          </DialogHeader>

          {/* ✅ NEW — gray "viewer" frame around the white invoice page,
              like a PDF opened from an email attachment */}
          <div className="flex-1 overflow-auto bg-slate-100 p-4 md:p-6">
            <div className="mx-auto h-full max-w-[850px] bg-white shadow-md rounded-md overflow-hidden">
              <iframe
                ref={iframeRef}
                title="invoice-preview"
                srcDoc={previewHtml}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>

          {/* ✅ NEW — hidden iframe for thermal (USB) print */}
          <iframe
            ref={thermalIframeRef}
            title="thermal-print"
            style={{
              position: "fixed",
              top: "-9999px",
              left: "-9999px",
              width: "265px",
              height: "600px",
              border: "0",
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Invoice #{activePreviewNumber} will be marked as cancelled. This
              action can affect reports and cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Keep Invoice
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancelInvoice}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Yes, Cancel Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
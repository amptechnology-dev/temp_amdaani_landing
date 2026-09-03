"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import {
  FileText,
  Check,
  Loader2,
  Printer,
  MessageCircle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { generateInvoiceHTML } from "../../utils/invoiceTemplate";
import { generateThermalInvoiceHTML } from "../../utils/generateThermalInvoiceHTML";

export default function InvoiceSummary({
  invoiceCalculations,
  paymentMethod,
  paymentNote,
  remarks,
  handleCreateInvoice,
  onInvoiceModalClose,
  isLoading,
  disabled,
  payment,
  cartItems = [],
  formValues = {},
  storedata = {},
  invoiceNumber = "PREVIEW-0001",
  isGstInvoice = false,
  isMrpEnabled = false,
  isFreePlan = true,
  appBrand = { name: "AMDAANI", logoUrl: "" },
  submitLabel = "Create Invoice",
}) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isCreatedInvoice, setIsCreatedInvoice] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef(null);
  const thermalIframeRef = useRef(null); // ✅ hidden iframe for thermal (USB) print

  const pageFormat = storedata?.settings?.printMode === "a5" ? "a5" : "a4";

  const buildPreviewHtml = () => {
    const now = new Date();
    return generateInvoiceHTML({
      preview: false,
      createdInvoice: false,
      invoiceData: { transactions: [], remarks, paymentMethod, paymentNote },
      formValues,
      cartItems,
      invoiceCalculations,
      invoiceNumber,
      currentDate: format(now, "dd-MMM-yyyy"),
      currentTime: format(now, "hh:mm a"),
      storedata,
      invoiceDate: now,
      isGstInvoice,
      isMrpEnabled,
      isFreePlan,
      appBrand,
      pageFormat,
      payment: {
        paid: payment?.paid ?? 0,
        due: payment?.due ?? 0,
        status: payment?.status ?? "unpaid",
      },
    });
  };

  const handlePreview = () => {
    if (!cartItems?.length) return;
    setIsCreatedInvoice(false);
    setPreviewHtml(buildPreviewHtml());
    setPreviewOpen(true);
  };

  const handleCreateClick = async () => {
    try {
      setIsCreating(true);
      const html = await handleCreateInvoice();

      if (!html) return;

      setIsCreatedInvoice(true);
      setPreviewHtml(html);
      setPreviewOpen(true);
    } catch (err) {
      console.error("Create invoice failed:", err);
      toast.error("Invoice create korte problem hoyeche");
    } finally {
      setIsCreating(false);
    }
  };

  const handleModalOpenChange = (open) => {
    setPreviewOpen(open);
    if (!open && isCreatedInvoice) {
      onInvoiceModalClose?.();
      setIsCreatedInvoice(false);
    }
  };

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  const handleThermalPrint = () => {
    const now = new Date();

    const html = generateThermalInvoiceHTML({
      createdInvoice: isCreatedInvoice,
      invoiceData: { transactions: [], remarks, paymentMethod, paymentNote },
      formValues,
      cartItems,
      invoiceCalculations,
      invoiceNumber,
      currentDate: format(now, "dd-MMM-yyyy"),
      currentTime: format(now, "hh:mm a"),
      storedata,
      invoiceDate: now,
      isGstInvoice,
      isFreePlan,
      payment: {
        paid: payment?.paid ?? 0,
        due: payment?.due ?? 0,
        status: payment?.status ?? "unpaid",
      },
      paperWidthMM: 80,
    });

    const iframe = thermalIframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

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
      const filename = `Invoice-${invoiceNumber}.pdf`;
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
    if (!cartItems?.length) return;

    const rawNumber =
      formValues?.contactNumber || formValues?.customerMobile || "";
    const phoneDigits = rawNumber.replace(/\D/g, "");

    if (!phoneDigits) {
      toast.error("Ei bill-e customer-er phone number pawa jayni");
      return;
    }

    try {
      setSendingWhatsApp(true);
      const blob = await generatePdfBlob();
      const filename = `Invoice-${invoiceNumber}.pdf`;
      const message = `Hello ${
        formValues?.customerName || "Customer"
      },\nHere is your invoice #${invoiceNumber}.\nThank you for your business!\nTotal Amount: ₹${
        invoiceCalculations?.grandTotal ?? 0
      }`;
      const waNumber =
        phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;

      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${invoiceNumber}`,
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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handlePreview}
          disabled={!cartItems?.length}
          title={!cartItems?.length ? "Add items to cart first" : ""}
        >
          <FileText className="w-4 h-4 mr-2" />
          Preview
        </Button>

        <Button
          onClick={handleCreateClick}
          disabled={disabled || isLoading || isCreating}
          className="flex-1"
        >
          {isLoading || isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {submitLabel === "Update Invoice" ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>

      {/* ✅ REDESIGNED — bigger dialog, title on its own row, buttons
          wrap cleanly below, content sits in a gray "viewer" frame like
          a PDF opened from email/Drive */}
      <Dialog open={previewOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-5xl w-full h-[92vh] p-0 flex flex-col overflow-hidden gap-0">
          <DialogHeader className="px-5 py-3 border-b shrink-0 space-y-2.5">
            <DialogTitle className="text-base md:text-lg font-semibold text-slate-800">
              {isCreatedInvoice ? "Invoice Created" : "Invoice Preview"}
            </DialogTitle>

            <div className="flex gap-2 flex-wrap">
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

          {/* ✅ gray "viewer" frame around the white invoice page */}
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

          {/* Hidden iframe — thermal HTML load hoye window.print() call hoy */}
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
    </div>
  );
}
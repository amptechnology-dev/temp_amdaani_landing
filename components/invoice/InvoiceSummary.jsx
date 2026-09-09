"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  FileText,
  Check,
  Loader2,
  Printer,
  MessageCircle,
  Download,
  Eye,
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
import { useUSBThermalPrinter } from "../../src/hooks/useUSBThermalPrinter";
import {
  generateThermalInvoiceESCPOS,
  generateThermalReceiptPreviewHTML,
  resolveDotWidth,
} from "../../utils/generateThermalInvoiceESCPOS";

export default function InvoiceSummary({
  invoiceCalculations,
  paymentMethod,
  paymentNote,
  remarks,
  handleCreateInvoice,
  handleSaveAndContinue,
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
  const [isSavingContinue, setIsSavingContinue] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Thermal preview state (works even before printer is connected)
  const [thermalPreviewOpen, setThermalPreviewOpen] = useState(false);
  const [thermalPreviewHtml, setThermalPreviewHtml] = useState("");
  const [isThermalPrinting, setIsThermalPrinting] = useState(false);

  const iframeRef = useRef(null);
  const thermalPreviewIframeRef = useRef(null);

  const {
    connect: connectPrinter,
    disconnect: disconnectPrinter,
    print: sendToPrinter,
    isConnected: isPrinterConnected,
    isConnecting: isPrinterConnecting,
  } = useUSBThermalPrinter();

  const pageFormat = storedata?.settings?.printMode === "a5" ? "a5" : "a4";
  const hasWebSerial =
    typeof navigator !== "undefined" && "serial" in navigator;

  // ── A4/A5 main invoice preview ──
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

  // ── Thermal receipt (preview + USB print) ──
  // Change to 80 if you're using a 3" (80mm) printer.
  const THERMAL_PAPER_WIDTH_MM = storedata?.settings?.thermalPaperWidthMM || 58;

  // Single shared params builder — preview and actual USB print are always
  // built from IDENTICAL data. Avoids the earlier bug where preview and
  // print silently used two different invoiceData shapes.
  const buildThermalParams = () => ({
    createdInvoice: isCreatedInvoice,
    invoiceData: {
      isIgst: false, // TODO: wire your real inter-state/IGST flag here if applicable
      subTotal: invoiceCalculations.subtotal,
      discountTotal: invoiceCalculations.discountTotal,
      roundOff: invoiceCalculations.roundOff,
      grandTotal: invoiceCalculations.grandTotal,
      paymentMethod,
      paymentNote,
      transactions: [],
    },
    formValues,
    cartItems,
    invoiceCalculations,
    invoiceNumber,
    invoiceDate: new Date(),
    storedata,
    isGstInvoice,
    isFreePlan,
    payment: {
      paid: payment?.paid ?? 0,
      due: payment?.due ?? 0,
      status: payment?.status ?? "unpaid",
    },
  });

  const buildThermalPreviewHtml = async () => {
    if (!cartItems?.length) return "";
    return generateThermalReceiptPreviewHTML(
      buildThermalParams(),
      THERMAL_PAPER_WIDTH_MM,
    );
  };

  const handleThermalPreview = async () => {
    if (!cartItems?.length) return;
    const html = await buildThermalPreviewHtml();
    setThermalPreviewHtml(html);
    setThermalPreviewOpen(true);
  };

  // Auto-resize the thermal preview iframe to fit its content, so the
  // whole receipt is visible like a real paper strip.
  const handleThermalPreviewIframeLoad = () => {
    const iframe = thermalPreviewIframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const height = doc?.body?.scrollHeight || 600;
      iframe.style.height = `${height + 20}px`;
    } catch (err) {
      console.warn("Thermal preview resize failed:", err);
    }
  };

  // Prints exactly what's shown in the thermal preview dialog via the
  // browser's own print dialog (useful for non-USB / any printer).
  const handleThermalPreviewPrint = () => {
    const win = thermalPreviewIframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  const handleConnectPrinter = async () => {
    try {
      await connectPrinter();
      toast.success("Printer connected successfully");
    } catch (err) {
      toast.error(err.message || "Printer connect korte problem hoyeche");
    }
  };

  // USB thermal print — renders the SAME styled HTML the preview shows,
  // screenshots it, and sends it to the printer as an ESC/POS raster
  // image. Preview and print can never visually diverge because print
  // literally is a screenshot of the preview HTML.
  const handleUSBThermalPrint = async () => {
    if (!isPrinterConnected) {
      toast.error("Age 'Connect Printer' e click korun");
      return;
    }
    if (!cartItems?.length) return;
    try {
      setIsThermalPrinting(true);
      const receipt = await generateThermalInvoiceESCPOS(
        buildThermalParams(),
        THERMAL_PAPER_WIDTH_MM,
      );
      await sendToPrinter(receipt);
      toast.success("Print is sending printer-e");
    } catch (err) {
      console.error("USB print error:", err);
      toast.error(err.message || "USB print failed");
    } finally {
      setIsThermalPrinting(false);
    }
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

  const handleSaveAndContinueClick = async () => {
    if (!handleSaveAndContinue) return;
    try {
      setIsSavingContinue(true);
      const html = await handleSaveAndContinue();
      if (html) {
        toast.success("Invoice saved. Ready for the next one.");
      }
    } catch (err) {
      console.error("Save & continue failed:", err);
      toast.error("Invoice save korte problem hoyeche");
    } finally {
      setIsSavingContinue(false);
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

  // F6 → Save shortcut (boss's spec)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "F6") {
        e.preventDefault();
        if (!disabled && !isLoading && !isCreating) handleCreateClick();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, isLoading, isCreating]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
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

        {handleSaveAndContinue && (
          <Button
            variant="outline"
            className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={handleSaveAndContinueClick}
            disabled={disabled || isLoading || isSavingContinue}
          >
            {isSavingContinue && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save & Continue
          </Button>
        )}

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
              <span className="ml-1.5 text-[10px] opacity-70">(F6)</span>
            </>
          )}
        </Button>
      </div>

      {/* ── Main A4/A5 Invoice Preview Dialog ── */}
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

              {/* Thermal preview button. Always visible, works even
                  before "Connect Printer" is clicked. */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleThermalPreview}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Thermal Preview
              </Button>

              {hasWebSerial &&
                (!isPrinterConnected ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConnectPrinter}
                    disabled={isPrinterConnecting}
                    className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    {isPrinterConnecting ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Connect Printer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleUSBThermalPrint}
                    disabled={isThermalPrinting}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    {isThermalPrinting ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    USB Print
                  </Button>
                ))}
            </div>
          </DialogHeader>

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
        </DialogContent>
      </Dialog>

      {/* ── Thermal Preview Dialog ──
          Uses the SAME styled HTML (generateThermalReceiptPreviewHTML)
          and SAME dot-width the actual USB raster print will use, so
          what's shown here is exactly what comes out of the printer.
          The "Print" button here uses the browser's own print dialog
          (useful even without a connected USB printer); the "USB Print"
          button in the main dialog sends this same content as an
          ESC/POS raster image. */}
      <Dialog open={thermalPreviewOpen} onOpenChange={setThermalPreviewOpen}>
        <DialogContent className="max-w-md w-full h-[92vh] p-0 flex flex-col overflow-hidden gap-0">
          <DialogHeader className="px-4 py-3 border-b shrink-0 flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-base font-semibold text-slate-800">
              Thermal Preview
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleThermalPreviewPrint}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-slate-200 p-4 flex justify-center">
            <div
              className="bg-white shadow-md rounded-sm"
              style={{
                width: `${resolveDotWidth(THERMAL_PAPER_WIDTH_MM)}px`,
                maxWidth: "100%",
              }}
            >
              <iframe
                ref={thermalPreviewIframeRef}
                title="thermal-preview"
                srcDoc={thermalPreviewHtml}
                onLoad={handleThermalPreviewIframeLoad}
                className="w-full border-0 bg-white block"
                style={{ minHeight: "400px" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

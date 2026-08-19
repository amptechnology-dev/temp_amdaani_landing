"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { generateInvoiceHTML } from "../../utils/invoiceTemplate";

export default function InvoiceSummary({
  invoiceCalculations,
  paymentMethod,
  paymentNote,
  remarks,
  handleCreateInvoice,
  isLoading,
  disabled,

  // ✅ single source of truth for paid/due/status — computed once in parent
  payment,

  // Preview er jonno lagbe (parent theke pass hoy)
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

  const handlePreview = () => {
    if (!cartItems?.length) return; // empty cart guard

    const now = new Date();

    const html = generateInvoiceHTML({
      preview: false, // full header/footer soho actual invoice er moto dekhabe
      createdInvoice: false,
      invoiceData: {
        transactions: [],
        remarks,
        paymentMethod,
        paymentNote,
      },
      formValues,
      cartItems, // ✅ computedItems (baseRate/taxableValue/gstAmount/total/mrp soho)
      invoiceCalculations, // ✅ gstBreakdown, discountTotal, grandTotal soho pura object
      invoiceNumber,
      currentDate: format(now, "dd-MMM-yyyy"),
      currentTime: format(now, "hh:mm a"),
      storedata,
      invoiceDate: now,
      isGstInvoice,
      isMrpEnabled,
      isFreePlan,
      appBrand,
      payment: {
        paid: payment?.paid ?? 0,
        due: payment?.due ?? 0,
        status: payment?.status ?? "unpaid",
      },
    });

    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
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
          onClick={handleCreateInvoice}
          disabled={disabled || isLoading}
          className="flex-1"
        >
          {isLoading ? (
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl w-full h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b shrink-0">
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <iframe
            title="invoice-preview"
            srcDoc={previewHtml}
            className="flex-1 w-full border-0 bg-white"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
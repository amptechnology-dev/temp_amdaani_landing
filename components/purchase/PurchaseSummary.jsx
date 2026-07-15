"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import { generatePurchaseHTML } from "../../utils/purchaseTemplate";

export default function PurchaseSummary({
  invoiceCalculations,
  paymentMethod,
  paymentNote,
  handleCreatePurchase,
  isLoading,
  disabled,
  payment,
  cartItems = [],
  formValues = {},
  storedata = {},
  purchaseNumber = "PREVIEW-0001",
  isGstInvoice = false,
  submitLabel = "Create Purchase",
}) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = () => {
    console.log("PurchaseSummary storedata prop:", storedata);
    if (!cartItems?.length) return;

    const now = new Date();
    const html = generatePurchaseHTML({
      preview: false,
      createdInvoice: false,
      invoiceData: { paymentMethod, paymentNote },
      formValues,
      cartItems,
      invoiceCalculations,
      invoiceNumber: purchaseNumber,
      currentDate: format(now, "dd-MMM-yyyy"),
      currentTime: format(now, "hh:mm a"),
      storedata,
      invoiceDate: now,
      isGstInvoice,
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
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handlePreview}
          disabled={!cartItems?.length}
          title={!cartItems?.length ? "Add items first" : ""}
        >
          <FileText className="w-4 h-4 mr-2" />
          Preview
        </Button>

        <Button onClick={handleCreatePurchase} disabled={disabled || isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {submitLabel === "Update Purchase" ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl w-full h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b shrink-0">
            <DialogTitle>Purchase Preview</DialogTitle>
          </DialogHeader>
          <iframe title="purchase-preview" srcDoc={previewHtml} className="flex-1 w-full border-0 bg-white" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
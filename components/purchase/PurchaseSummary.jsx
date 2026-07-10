"use client";

import { useState } from "react";
import { format } from "date-fns";
import { IndianRupee, FileText, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import DiscountInput from "../invoice/DiscountInput"; // reuse existing discount input
import PaymentMethodSelector from "../invoice/PaymentMethodSelector"; // reuse existing
import { generatePurchaseHTML } from "../../utils/purchaseTemplate";

export default function PurchaseSummary({
  discount,
  setDiscount,
  invoiceCalculations,
  paymentMethod,
  setPaymentMethod,
  paidAmount,
  setPaidAmount,
  paymentNote,
  setPaymentNote,
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

  const balance = payment?.due ?? Math.max(0, invoiceCalculations.netTotal - paidAmount);

  const handlePreview = () => {
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
        paid: payment?.paid ?? paidAmount,
        due: balance,
        status: payment?.status ?? "unpaid",
      },
    });

    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      <DiscountInput
        discount={discount}
        onChange={setDiscount}
        total={invoiceCalculations.grandTotalRaw ?? invoiceCalculations.subtotal}
      />

      <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

      <div className="space-y-2">
        <Label>Paid Amount</Label>
        <div className="relative">
          <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            type="number"
            className="pl-10"
            value={paidAmount}
            min={0}
            max={invoiceCalculations.netTotal}
            onChange={(e) => {
              const val = Number(e.target.value) || 0;
              const clamped = Math.min(Math.max(0, val), invoiceCalculations.netTotal);
              setPaidAmount(clamped);
            }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Balance:</span>
          <span className={`font-medium ${balance > 0 ? "text-orange-600" : "text-green-600"}`}>
            ₹{balance.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal (Taxable):</span>
          <span>₹{invoiceCalculations.subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Tax:</span>
          <span>₹{(invoiceCalculations.totalTax || 0).toFixed(2)}</span>
        </div>

        {invoiceCalculations.discountTotal > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            <span>- ₹{invoiceCalculations.discountTotal.toFixed(2)}</span>
          </div>
        )}

        {invoiceCalculations.roundOff !== 0 && (
          <div className="flex justify-between text-muted-foreground text-sm">
            <span>Round Off:</span>
            <span>
              {invoiceCalculations.roundOff > 0 ? "+" : ""}
              ₹{invoiceCalculations.roundOff.toFixed(2)}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Net Total:</span>
          <span>₹{invoiceCalculations.netTotal.toFixed(2)}</span>
        </div>

        {payment?.due > 0 && (
          <div className="flex justify-between text-sm text-orange-600">
            <span>Due:</span>
            <span>₹{payment.due.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handlePreview}
          disabled={!cartItems?.length}
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
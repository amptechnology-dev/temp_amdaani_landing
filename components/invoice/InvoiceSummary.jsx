"use client";

import { useState } from "react";
import { format } from "date-fns";
import { IndianRupee, FileText, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import DiscountInput from "./DiscountInput";
import PaymentMethodSelector from "./PaymentMethodSelector";
import { generateInvoiceHTML } from "../../utils/invoiceTemplate";

export default function InvoiceSummary({
  discount,
  setDiscount,
  invoiceCalculations,
  paymentMethod,
  setPaymentMethod,
  paidAmount,
  setPaidAmount,
  paymentNote,
  setPaymentNote,
  remarks,
  setRemarks,
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
  isFreePlan = true,
  appBrand = { name: "AMDAANI", logoUrl: "" },
  submitLabel = "Create Invoice",
}) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const balance = payment?.due ?? Math.max(0, invoiceCalculations.netTotal - paidAmount);

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
      cartItems, // ✅ ekhon computedItems (baseRate/taxableValue/gstAmount/total soho)
      invoiceCalculations, // ✅ gstBreakdown, discountTotal, grandTotal soho pura object
      invoiceNumber,
      currentDate: format(now, "dd-MMM-yyyy"),
      currentTime: format(now, "hh:mm a"),
      storedata,
      invoiceDate: now,
      isGstInvoice,
      isFreePlan,
      appBrand,
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
      {/* Discount */}
      <DiscountInput
        discount={discount}
        onChange={setDiscount}
        total={invoiceCalculations.grandTotalRaw ?? invoiceCalculations.subtotal}
      />

      {/* Payment Method */}
      <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

      {/* Paid Amount */}
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
              const clamped = Math.min(
                Math.max(0, val),
                invoiceCalculations.netTotal
              );
              setPaidAmount(clamped);
            }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Balance:</span>
          <span
            className={`font-medium ${
              balance > 0 ? "text-orange-600" : "text-green-600"
            }`}
          >
            ₹{balance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Note */}
      <div className="space-y-2">
        <Label>Payment Note (Optional)</Label>
        <Textarea
          rows={2}
          placeholder="Add any payment notes..."
          value={paymentNote}
          onChange={(e) => setPaymentNote(e.target.value)}
        />
      </div>

      {/* Remarks */}
      <div className="space-y-2">
        <Label>Remarks (Optional)</Label>
        <Textarea
          rows={3}
          placeholder="Add invoice remarks..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      {/* Totals */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal:</span>
          <span>₹{(invoiceCalculations.grandTotalRaw ?? invoiceCalculations.subtotal).toFixed(2)}</span>
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
          <span>Grand Total:</span>
          <span>₹{invoiceCalculations.netTotal.toFixed(2)}</span>
        </div>

        {payment?.due > 0 && (
          <div className="flex justify-between text-sm text-orange-600">
            <span>Due:</span>
            <span>₹{payment.due.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
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
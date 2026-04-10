"use client";

import { IndianRupee, FileText, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

import DiscountInput from "./DiscountInput";
import PaymentMethodSelector from "./PaymentMethodSelector";

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
}) {
  const balance = Math.max(0, invoiceCalculations.netTotal - paidAmount);

  return (
    <div className="space-y-4">
      {/* Discount */}
      <DiscountInput
        discount={discount}
        onChange={setDiscount}
        total={invoiceCalculations.subtotal}
      />

      {/* Payment Method */}
      <PaymentMethodSelector
        value={paymentMethod}
        onChange={setPaymentMethod}
      />

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
            onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
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
          <span>₹{invoiceCalculations.subtotal.toFixed(2)}</span>
        </div>

        {invoiceCalculations.discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            <span>- ₹{invoiceCalculations.discountAmount.toFixed(2)}</span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Grand Total:</span>
          <span>₹{invoiceCalculations.netTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1">
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
              Creating...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Create Invoice
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

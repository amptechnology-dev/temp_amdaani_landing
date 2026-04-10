"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, Download, X, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

export default function InvoicePreview({ isOpen, onClose, invoiceData }) {
  if (!invoiceData) return null;

  const {
    customer,
    items = [],
    calculations = {},
    invoiceNumber,
    paymentMethod,
    paidAmount = 0,
    remarks,
    isGstInvoice = true,
  } = invoiceData;

  const {
    subtotal = 0,
    totalTax = 0,
    discountAmount = 0,
    netTotal = 0,
    roundOff = 0,
  } = calculations;

  const paymentStatus =
    paidAmount >= netTotal ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

  const statusColors = {
    paid: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    unpaid: "bg-red-100 text-red-800",
  };

  const handlePrint = () => {
    const printContent = generatePrintableHTML();
    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownload = () => {
    // Implement PDF download functionality
    toast.info("PDF download feature coming soon!");
  };

  const generatePrintableHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .company-info { flex: 2; }
          .invoice-info { flex: 1; text-align: right; }
          .customer-info { margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .totals { margin-top: 20px; text-align: right; }
          .totals table { width: 300px; margin-left: auto; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>YOUR COMPANY NAME</h1>
              <p>Company Address Here</p>
              <p>GSTIN: ${isGstInvoice ? "XXAAXXX1234X1Z5" : "N/A"}</p>
            </div>
            <div class="invoice-info">
              <h2>${isGstInvoice ? "TAX INVOICE" : "INVOICE"}</h2>
              <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
              <p><strong>Date:</strong> ${format(new Date(), "dd-MMM-yyyy")}</p>
            </div>
          </div>

          <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>${customer?.name || "Customer"}</strong></p>
            <p>${customer?.mobile ? `Mobile: ${customer.mobile}` : ""}</p>
            ${customer?.address ? `<p>Address: ${customer.address}</p>` : ""}
            ${customer?.gstNumber ? `<p>GSTIN: ${customer.gstNumber}</p>` : ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>GST</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.qty}</td>
                  <td>₹${item.price.toFixed(2)}</td>
                  <td>${item.gstRate || 0}%</td>
                  <td>₹${(item.price * item.qty).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>₹${subtotal.toFixed(2)}</td>
              </tr>
              ${
                isGstInvoice && totalTax > 0
                  ? `
                <tr>
                  <td>GST:</td>
                  <td>₹${totalTax.toFixed(2)}</td>
                </tr>
              `
                  : ""
              }
              ${
                discountAmount > 0
                  ? `
                <tr>
                  <td>Discount:</td>
                  <td>-₹${discountAmount.toFixed(2)}</td>
                </tr>
              `
                  : ""
              }
              ${
                Math.abs(roundOff) > 0
                  ? `
                <tr>
                  <td>Round Off:</td>
                  <td>${roundOff >= 0 ? "+" : ""}₹${Math.abs(roundOff).toFixed(
                      2
                    )}</td>
                </tr>
              `
                  : ""
              }
              <tr style="font-weight: bold; border-top: 2px solid #000;">
                <td>Grand Total:</td>
                <td>₹${netTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Paid:</td>
                <td>₹${paidAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Balance:</td>
                <td>₹${Math.max(0, netTotal - paidAmount).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${
            remarks
              ? `
            <div class="remarks" style="margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
              <strong>Remarks:</strong> ${remarks}
            </div>
          `
              : ""
          }

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Invoice Preview - #{invoiceNumber}
            </DialogTitle>
            <Badge className={statusColors[paymentStatus]}>
              {paymentStatus.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="border rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">YOUR COMPANY NAME</h2>
                  <p className="text-muted-foreground">
                    123 Business Street, City - 560001
                  </p>
                  <p className="text-muted-foreground">
                    GSTIN: {isGstInvoice ? "XXAAXXX1234X1Z5" : "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <h1 className="text-2xl font-bold text-primary">
                    {isGstInvoice ? "TAX INVOICE" : "INVOICE"}
                  </h1>
                  <div className="space-y-1 mt-2">
                    <p className="font-medium">#{invoiceNumber}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Bill To:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-lg">
                    {customer?.name || "Customer"}
                  </p>
                  {customer?.mobile && (
                    <p className="text-muted-foreground">
                      Mobile: {customer.mobile}
                    </p>
                  )}
                  {customer?.gstNumber && (
                    <p className="text-muted-foreground">
                      GSTIN: {customer.gstNumber}
                    </p>
                  )}
                </div>
                <div>
                  {customer?.address && (
                    <div>
                      <p className="font-medium mb-1">Address:</p>
                      <p className="text-muted-foreground">
                        {customer.address}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Qty</th>
                      <th className="text-left p-3 font-medium">Unit</th>
                      <th className="text-left p-3 font-medium">Price</th>
                      <th className="text-left p-3 font-medium">GST</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.hsn && (
                              <p className="text-xs text-muted-foreground">
                                HSN: {item.hsn}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{item.qty}</td>
                        <td className="p-3">{item.unit || "pcs"}</td>
                        <td className="p-3">₹{item.price.toFixed(2)}</td>
                        <td className="p-3">
                          {item.gstRate > 0 ? `${item.gstRate}%` : "-"}
                        </td>
                        <td className="p-3 font-medium">
                          ₹{(item.price * item.qty).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border rounded-lg p-6">
              <div className="max-w-md ml-auto space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>

                {isGstInvoice && totalTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST:</span>
                    <span className="font-medium">₹{totalTax.toFixed(2)}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {Math.abs(roundOff) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Round Off:</span>
                    <span
                      className={`font-medium ${
                        roundOff >= 0 ? "text-green-600" : "text-orange-600"
                      }`}
                    >
                      {roundOff >= 0 ? "+" : ""}₹{Math.abs(roundOff).toFixed(2)}
                    </span>
                  </div>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between text-xl font-bold">
                  <span>Grand Total:</span>
                  <span>₹{netTotal.toFixed(2)}</span>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Payment Method:
                    </span>
                    <span className="font-medium">
                      {paymentMethod?.toUpperCase() || "CASH"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium">
                      ₹{paidAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span
                      className={`font-medium ${
                        netTotal - paidAmount > 0
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      ₹{Math.max(0, netTotal - paidAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {remarks && (
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Remarks</h3>
                <p className="text-muted-foreground">{remarks}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border rounded-lg p-6 text-center">
              <p className="text-lg font-medium mb-2">
                Thank you for your business!
              </p>
              <p className="text-sm text-muted-foreground">
                This is a computer-generated invoice and does not require a
                signature.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Check className="w-3 h-3" />
              {items.length} items
            </Badge>
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              {paymentStatus.toUpperCase()}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

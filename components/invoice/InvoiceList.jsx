"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Phone, Calendar, Pencil, FileText, Receipt } from "lucide-react";

import api from "../../utils/api";
import { generateInvoiceHTML } from "../../utils/invoiceTemplate";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusStyles = {
  paid: "bg-green-600 text-white",
  partial: "bg-orange-500 text-white",
  unpaid: "bg-red-500 text-white",
};

export default function RecentInvoicesPanel({ limit = 8, refreshKey }) {
  const router = useRouter();

  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchRecentInvoices();
  }, [refreshKey]);

  const fetchRecentInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/invoice?limit=${limit}&sort=-createdAt`);
      setInvoices(res?.data?.docs || res?.data || []);
    } catch {
      toast.error("Failed to load recent invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = async (invoice) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const res = await api.get(`/invoice/id/${invoice._id}`);
      const fullInvoice = res?.data;

      if (!fullInvoice) {
        toast.error("Failed to load invoice details");
        setPreviewOpen(false);
        return;
      }

      const normalizedItems = (fullInvoice.items || []).map((item) => ({
        ...item,
        qty: Number(item.quantity ?? item.qty ?? 0),
        price: Number(item.sellingPrice ?? item.price ?? 0),
        baseRate: Number(item.sellingPrice ?? item.price ?? 0),
        gstRate: Number(item.gstRate ?? 0),
        isTaxInclusive: item.isTaxInclusive ?? false,
        discount: Number(item.discount ?? 0),
        hsn: item.hsn ?? "",
        unit: item.unit ?? "pcs",
        total: Number(item.total ?? 0),
        taxableValue: Number(item.taxableValue ?? item.total ?? 0),
        gstAmount: Number(item.gstAmount ?? 0),
      }));

      const html = generateInvoiceHTML({
        preview: false,
        createdInvoice: true,
        invoiceData: fullInvoice,
        formValues: {
          contactNumber: fullInvoice.customerMobile,
          customerName: fullInvoice.customerName,
          customerAddress: fullInvoice.customerAddress,
          customerState: fullInvoice.customerState,
          customerGstNumber: fullInvoice.customerGstNumber,
        },
        cartItems: normalizedItems,
        invoiceCalculations: {
          subtotal: fullInvoice.subTotal,
          grandTotalRaw: fullInvoice.subTotal,
          discountTotal: fullInvoice.discountTotal || 0,
          grandTotal: fullInvoice.grandTotal,
          netTotal: fullInvoice.grandTotal,
          totalTax: fullInvoice.gstTotal || 0,
          roundOff: fullInvoice.roundOff || 0,
          gstBreakdown: fullInvoice.gstBreakdown || {},
        },
        invoiceNumber: fullInvoice.invoiceNumber,
        storedata: fullInvoice.storeSnapshot || {},
        invoiceDate: new Date(fullInvoice.createdAt || fullInvoice.invoiceDate),
        isGstInvoice: fullInvoice.type === "gst",
        payment: {
          paid: fullInvoice.amountPaid || 0,
          due: fullInvoice.amountDue || 0,
          status: fullInvoice.paymentStatus || "unpaid",
        },
      });

      setPreviewHtml(html);
    } catch {
      toast.error("Failed to load invoice preview");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleEditClick = (e, invoice) => {
    e.stopPropagation();
    router.push(`/dashboard/sales?edit=${invoice._id}`);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="w-4 h-4 text-blue-600" />
            Recent Invoices
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-center text-sm text-slate-400 py-6">
              Loading...
            </p>
          ) : invoices.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">
              No invoices yet
            </p>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv._id}
                onClick={() => handleCardClick(inv)}
                className="bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:shadow-sm hover:border-blue-200 transition-all relative group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">
                      {inv.customerName || "No Customer"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {inv.customerMobile || "-"}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="italic text-xs font-semibold text-slate-700">
                      #{inv.invoiceNumber}
                    </p>
                    <Badge
                      className={`text-[10px] mt-1 capitalize ${
                        statusStyles[inv.paymentStatus] || statusStyles.unpaid
                      }`}
                    >
                      {inv.paymentStatus}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {format(
                      new Date(inv.createdAt || inv.invoiceDate),
                      "dd MMM, hh:mm a"
                    )}
                  </div>
                  <p className="text-blue-600 font-bold text-sm">
                    ₹{Number(inv.grandTotal || 0).toFixed(2)}
                  </p>
                </div>

                {/* Edit button - shows on hover */}
                <button
                  onClick={(e) => handleEditClick(e, inv)}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit invoice"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl w-full h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b shrink-0 flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Invoice Preview
            </DialogTitle>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Loading preview...
            </div>
          ) : (
            <iframe
              title="invoice-preview"
              srcDoc={previewHtml}
              className="flex-1 w-full border-0 bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
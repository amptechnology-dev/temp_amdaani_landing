"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Phone, Calendar, Pencil, FileText, Receipt } from "lucide-react";

import api from "../../utils/api";
import { generatePurchaseHTML } from "../../utils/purchaseTemplate";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusStyles = {
  paid: "bg-green-600 text-white",
  partial: "bg-orange-500 text-white",
  unpaid: "bg-red-500 text-white",
};

export default function RecentPurchasesPanel({ limit = 8, refreshKey }) {
  const router = useRouter();
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchRecentPurchases();
  }, [refreshKey]);

  const fetchRecentPurchases = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/purchase?limit=${limit}&sort=-createdAt`);
      setPurchases(res?.data?.docs || res?.data || []);
    } catch {
      toast.error("Failed to load recent purchases");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = async (purchase) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const res = await api.get(`/purchase/id/${purchase._id}`);
      const full = res?.data;

      if (!full) {
        toast.error("Failed to load purchase details");
        setPreviewOpen(false);
        return;
      }

      const normalizedItems = (full.items || []).map((item) => ({
        ...item,
        qty: Number(item.quantity ?? item.qty ?? 0),
        costPrice: Number(item.costPrice ?? item.rate ?? 0),
        rate: Number(item.rate ?? 0),
        purchaseDiscount: Number(item.purchaseDiscount ?? 0),
        gstRate: Number(item.gstRate ?? 0),
        isPurchaseTaxInclusive: item.isPurchaseTaxInclusive ?? false,
        hsn: item.hsn ?? "",
        unit: item.unit ?? "pcs",
        total: Number(item.total ?? 0),
        taxableValue: Number(item.taxableValue ?? 0),
        gstAmount: Number(item.gstAmount ?? 0),
        baseRate: Number(item.baseRate ?? 0),
        mrp: Number(item.mrp ?? 0),
      }));

      const html = generatePurchaseHTML({
        preview: false,
        createdInvoice: true,
        invoiceData: {
          ...full,
          isIgst: full.isIgst,
          status: full.status,
        },
        formValues: {
          vendorNumber: full.vendorMobile,
          vendorName: full.vendorName,
          address: full.vendorAddress,
          state: full.vendorState,
          gstNumber: full.vendorGstNumber,
        },
        cartItems: normalizedItems,
        invoiceCalculations: {
          subtotal: full.subTotal,
          grandTotalRaw: full.subTotal,
          discountTotal: full.discountTotal || 0,
          grandTotal: full.grandTotal,
          netTotal: full.grandTotal,
          totalTax: full.gstTotal || 0,
          roundOff: full.roundOff || 0,
          gstBreakdown: full.gstBreakdown || {},
        },
        invoiceNumber: full.invoiceNumber,
        storedata: full.storeSnapshot || {},
        invoiceDate: new Date(full.date || full.createdAt),
        isGstInvoice: !!full.vendorGstNumber,
        payment: {
          paid: full.amountPaid || 0,
          due: full.amountDue || 0,
          status: full.paymentStatus || "unpaid",
        },
      });

      setPreviewHtml(html);
    } catch {
      toast.error("Failed to load purchase preview");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleEditClick = (e, purchase) => {
    e.stopPropagation();
    router.push(`/dashboard/purchase?edit=${purchase._id}`);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="w-4 h-4 text-blue-600" />
            Recent Purchases
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-center text-sm text-slate-400 py-6">Loading...</p>
          ) : purchases.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">No purchases yet</p>
          ) : (
            purchases.map((p) => (
              <div
                key={p._id}
                onClick={() => handleCardClick(p)}
                className="bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:shadow-sm hover:border-blue-200 transition-all relative group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">
                      {p.vendorName || "No Vendor"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {p.vendorMobile || "-"}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="italic text-xs font-semibold text-slate-700">
                      #{p.invoiceNumber}
                    </p>
                    <Badge className={`text-[10px] mt-1 capitalize ${statusStyles[p.paymentStatus] || statusStyles.unpaid}`}>
                      {p.paymentStatus}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(p.createdAt || p.date), "dd MMM, hh:mm a")}
                  </div>
                  <p className="text-blue-600 font-bold text-sm">
                    ₹{Number(p.grandTotal || 0).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={(e) => handleEditClick(e, p)}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit purchase"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl w-full h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Purchase Preview
            </DialogTitle>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Loading preview...
            </div>
          ) : (
            <iframe title="purchase-preview" srcDoc={previewHtml} className="flex-1 w-full border-0 bg-white" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
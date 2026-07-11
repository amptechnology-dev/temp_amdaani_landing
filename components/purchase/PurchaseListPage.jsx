"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { format, isToday, isYesterday, isWithinInterval, subDays } from "date-fns";
import { Search, Plus, Phone, Calendar, Pencil, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import api from "../../utils/api";

const statusStyles = {
  paid: "bg-green-600 hover:bg-green-600 text-white",
  partial: "bg-orange-500 hover:bg-orange-500 text-white",
  unpaid: "bg-red-500 hover:bg-red-500 text-white",
};

const dateFilters = ["All", "Today", "Yesterday", "This Week"];
const statusFilters = ["All", "Paid", "Partial", "Unpaid"];

export default function PurchaseListPage({ refreshKey, onCreateNew, onEditPurchase }) {
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchPurchases();
  }, [refreshKey]);

  const fetchPurchases = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/purchase?limit=200&sort=-createdAt");
      setPurchases(res?.data?.docs || res?.data || []);
    } catch {
      toast.error("Failed to load purchases");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    let list = [...purchases];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.vendorName?.toLowerCase().includes(q) ||
          p.vendorMobile?.toLowerCase().includes(q) ||
          p.invoiceNumber?.toLowerCase().includes(q)
      );
    }

    if (dateFilter !== "All") {
      list = list.filter((p) => {
        const d = new Date(p.date || p.createdAt);
        if (dateFilter === "Today") return isToday(d);
        if (dateFilter === "Yesterday") return isYesterday(d);
        if (dateFilter === "This Week")
          return isWithinInterval(d, { start: subDays(new Date(), 7), end: new Date() });
        return true;
      });
    }

    if (statusFilter !== "All") {
      list = list.filter(
        (p) => (p.paymentStatus || "unpaid").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    return list;
  }, [purchases, searchTerm, dateFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Purchases</h1>
            <p className="text-sm text-slate-400 mt-1">Manage your vendor purchases</p>
          </div>
          <Button onClick={onCreateNew} className="rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            New Purchase
          </Button>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, phone, or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-12 rounded-full bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {dateFilters.map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  dateFilter === f
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {dateFilter === f ? "✓ " : ""}
                {f}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  statusFilter === f
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {statusFilter === f ? "✓ " : ""}
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
          ) : filteredPurchases.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-200">
              <Truck className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">No Purchases Found</h3>
              <p className="text-sm text-slate-400 max-w-sm mb-4">
                {searchTerm ? `No purchases match "${searchTerm}".` : "Start by creating your first purchase."}
              </p>
              {!searchTerm && (
                <Button onClick={onCreateNew} className="rounded-full">
                  <Plus className="w-4 h-4 mr-2" />
                  New Purchase
                </Button>
              )}
            </div>
          ) : (
            filteredPurchases.map((p) => (
              <div
                key={p._id}
                onClick={() => onEditPurchase(p._id)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all relative group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{p.vendorName || "No Vendor"}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {p.vendorMobile || "-"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="italic text-xs font-semibold text-blue-600 flex items-center gap-1">
                      #{p.invoiceNumber}
                      <Pencil className="w-3 h-3" />
                    </p>
                    <div className="flex gap-1 mt-1 justify-end">
                      <Badge variant="outline" className="text-[10px]">
                        {p.vendorGstNumber ? "GST" : "Non-GST"}
                      </Badge>
                      <Badge className={`text-[10px] capitalize ${statusStyles[p.paymentStatus] || statusStyles.unpaid}`}>
                        {p.paymentStatus || "unpaid"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(p.createdAt || p.date), "dd MMM yyyy, hh:mm a")}
                  </div>
                  <p className="text-blue-600 font-bold text-sm">
                    ₹{Number(p.grandTotal || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
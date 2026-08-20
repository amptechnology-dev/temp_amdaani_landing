"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, isToday, isYesterday, startOfWeek, isWithinInterval } from "date-fns";
import { toast } from "sonner";
import { Search, Phone, Calendar, Pencil, Plus, FileText, ReceiptText } from "lucide-react";

import api from "../../utils/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusStyles = {
  paid: "bg-green-600 text-white",
  partial: "bg-orange-500 text-white",
  unpaid: "bg-red-500 text-white",
};

const FilterChip = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${
      active
        ? "bg-emerald-50 border-emerald-400 text-emerald-700"
        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
    }`}
  >
    {active && <span className="mr-1">✓</span>}
    {children}
  </button>
);

export default function InvoiceListPage({ refreshKey, onCreateNew, onEditInvoice }) {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchInvoices();
  }, [refreshKey]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/invoice?limit=200&sort=-createdAt");
      setInvoices(res?.data?.docs || res?.data || []);
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.customerName?.toLowerCase().includes(q) ||
        inv.customerMobile?.includes(q) ||
        inv.invoiceNumber?.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (dateFilter !== "all") {
        const createdAt = new Date(inv.createdAt || inv.invoiceDate);
        if (dateFilter === "today" && !isToday(createdAt)) return false;
        if (dateFilter === "yesterday" && !isYesterday(createdAt)) return false;
        if (dateFilter === "thisWeek") {
          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          if (!isWithinInterval(createdAt, { start: weekStart, end: new Date() })) return false;
        }
      }
      if (statusFilter !== "all" && inv.paymentStatus !== statusFilter) return false;
      return true;
    });
  }, [invoices, searchQuery, dateFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Invoices</h1>
          </div>
          <Button onClick={onCreateNew} className="rounded-full gap-2">
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>

        {/* Search + filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, phone, or invoice number..."
              className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterChip active={dateFilter === "all"} onClick={() => setDateFilter("all")}>All</FilterChip>
            <FilterChip active={dateFilter === "today"} onClick={() => setDateFilter("today")}>Today</FilterChip>
            <FilterChip active={dateFilter === "yesterday"} onClick={() => setDateFilter("yesterday")}>Yesterday</FilterChip>
            <FilterChip active={dateFilter === "thisWeek"} onClick={() => setDateFilter("thisWeek")}>This Week</FilterChip>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>All</FilterChip>
            <FilterChip active={statusFilter === "paid"} onClick={() => setStatusFilter("paid")}>Paid</FilterChip>
            <FilterChip active={statusFilter === "partial"} onClick={() => setStatusFilter("partial")}>Partial</FilterChip>
            <FilterChip active={statusFilter === "unpaid"} onClick={() => setStatusFilter("unpaid")}>Unpaid</FilterChip>
          </div>
        </div>

        {/* Grid of invoice cards — full width, multi-column on wide screens */}
        {isLoading ? (
          <p className="text-center text-slate-400 py-16">Loading...</p>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <FileText className="w-10 h-10 mb-3 opacity-40" />
            No invoices found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredInvoices.map((inv) => (
              <div
                key={inv._id}
                onClick={() => onEditInvoice(inv._id)}
                className="bg-white border border-slate-200 rounded-2xl p-4 relative hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {inv.customerName || "No Customer Found"}
                    </p>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {inv.customerMobile || "-"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="italic font-semibold text-slate-800 text-sm">#{inv.invoiceNumber}</p>
                    <div className="flex items-center gap-1.5 justify-end mt-1">
                      <Badge variant="outline" className="text-xs">{inv.type === "gst" ? "GST" : "Non-GST"}</Badge>
                      <Badge className={`text-xs capitalize ${statusStyles[inv.paymentStatus] || statusStyles.unpaid}`}>
                        {inv.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(inv.createdAt || inv.invoiceDate), "dd MMM yyyy, hh:mm a")}
                  </div>
                  <p className="text-blue-600 font-bold text-lg">₹{Number(inv.grandTotal || 0).toFixed(2)}</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditInvoice(inv._id);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                  title="Edit invoice"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfToday,
  startOfWeek,
  startOfMonth,
  subMonths,
} from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  Calendar,
  Loader2,
  PackageX,
  IndianRupee,
  Plus,
} from "lucide-react";
import api from "../../utils/api";
import { Button } from "@/components/ui/button";
import AdjustStockModal from "./AdjustStockModal";

const DATE_FILTERS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "All", value: "all" },
];

function getStartDateFromFilter(filter) {
  switch (filter) {
    case "today":
      return startOfToday();
    case "this_week":
      return startOfWeek(new Date());
    case "this_month":
      return startOfMonth(new Date());
    case "last_month":
      return startOfMonth(subMonths(new Date(), 1));
    default:
      return null; // "all" — no date filter sent to API
  }
}

const TYPE_CONFIG = {
  PURCHASE: {
    icon: ArrowDownCircle,
    color: "#10b981",
    bg: "#ecfdf5",
    label: "Purchase",
  },
  SALE: {
    icon: ArrowUpCircle,
    color: "#ef4444",
    bg: "#fef2f2",
    label: "Sale",
  },
  ADJUSTMENT: {
    icon: SlidersHorizontal,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    label: "Adjustment",
  },
};

function getTypeConfig(type, direction) {
  const base =
    TYPE_CONFIG[type] || {
      icon: SlidersHorizontal,
      color: "#64748b",
      bg: "#f1f5f9",
      label: type,
    };

  // ✅ Same as RN screen — ADJUSTMENT color/label depends on direction
  if (type === "ADJUSTMENT") {
    const isOut = direction === "OUT";
    return {
      ...base,
      color: isOut ? "#ef4444" : "#10b981",
      bg: isOut ? "#fef2f2" : "#ecfdf5",
      label: isOut ? "Stock Out" : "Stock In",
    };
  }
  return base;
}

const formatAmount = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export default function StockTransactionsPage({
  productId,
  productName,
  onBack,
}) {
  const [product, setProduct] = useState(null);
  const [isFetchingProduct, setIsFetchingProduct] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDateFilter, setActiveDateFilter] = useState("this_month");
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  const currentStock = Number(product?.currentStock ?? 0);
  const costPrice = Number(product?.costPrice ?? 0);
  const totalStockValue = currentStock * costPrice;

  // ── Always pull FRESH product data (currentStock / costPrice can be
  // stale if passed only from a list page) — mirrors RN screen's approach
  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    try {
      setIsFetchingProduct(true);
      const res = await api.get(`/product/id/${productId}`);
      const data = res?.data?.data || res?.data;
      if (data) setProduct(data);
    } catch (err) {
      console.error("Failed to fetch product:", err);
    } finally {
      setIsFetchingProduct(false);
    }
  }, [productId]);

  const fetchTransactions = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const params = {};
      const startDate = getStartDateFromFilter(activeDateFilter);
      if (startDate) params.startDate = startDate.toISOString().split("T")[0];

      const res = await api.get(`/product/stock-transaction/${productId}`, {
        params,
      });
      setTransactions(res?.success ? res?.data?.docs || [] : []);
    } catch (err) {
      console.error("Failed to fetch stock transactions:", err);
      toast.error("Failed to load stock transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [productId, activeDateFilter]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ✅ After a successful adjustment — refresh BOTH list and product
  // (stock/cost price can change) so the overview card updates instantly,
  // same as RN's onStockAdjusted callback.
  const handleAdjusted = async () => {
    await Promise.all([fetchTransactions(), fetchProduct()]);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="rounded-full h-9 w-9 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Stock Transactions
            </h1>
            <p className="text-xs text-slate-400">
              Track every stock movement for this product
            </p>
          </div>
        </div>

        {/* Overview card — Stock × Unit Cost = Stock Value */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-blue-600" />
              </span>
              <p className="font-semibold text-slate-800 truncate">
                {product?.name || productName || "Loading..."}
              </p>
            </div>

            <div className="text-right">
              {isFetchingProduct ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />
              ) : (
                <>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-sm font-bold text-amber-500">
                      {currentStock}
                    </span>
                    <span className="text-xs text-slate-400">×</span>
                    <span className="text-sm font-semibold text-slate-500">
                      ₹{costPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-slate-400">=</span>
                    <span className="text-base font-bold text-emerald-600">
                      {formatAmount(totalStockValue)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Stock × Unit Cost = Stock Value
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Date filters + Adjust Stock button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveDateFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                  activeDateFilter === f.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => setAdjustModalOpen(true)}
            className="h-9 rounded-full text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Adjust Stock
          </Button>
        </div>

        {/* Transactions list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <PackageX className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-600">
                No Transactions
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeDateFilter !== "all"
                  ? `No transactions found for ${
                      DATE_FILTERS.find((f) => f.value === activeDateFilter)
                        ?.label
                    }`
                  : "No stock transactions found"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((item) => {
                const config = getTypeConfig(
                  item.transactionType,
                  item.direction,
                );
                const Icon = config.icon;
                const isInbound = item.direction === "IN";

                return (
                  <div
                    key={item._id}
                    className="px-4 py-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: config.bg }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{ color: config.color }}
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {config.label}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <p className="text-[11px] text-slate-400">
                              {format(
                                new Date(item.updatedAt),
                                "dd MMM yy hh:mm a",
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className="text-sm font-bold"
                          style={{ color: isInbound ? "#10b981" : "#ef4444" }}
                        >
                          {isInbound ? "+" : "-"}
                          {item.quantity}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                          ₹{item.totalAmount}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 ml-12">
                      <IndianRupee className="w-3 h-3 text-slate-400" />
                      <span className="text-[11px] text-slate-500">
                        Rate: ₹{item.rate}
                      </span>
                    </div>

                    {item.remarks ? (
                      <p className="text-[11px] text-slate-500 mt-1 ml-12 line-clamp-2">
                        {item.remarks}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AdjustStockModal
        open={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        item={
          product
            ? { ...product, _id: productId }
            : { _id: productId, name: productName, costPrice: 0 }
        }
        onAdjusted={handleAdjusted}
      />
    </div>
  );
}
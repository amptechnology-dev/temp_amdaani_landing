"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, X, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import api from "../../utils/api";

const todayStr = () => new Date().toISOString().split("T")[0];

// Mirrors the reasons used in the mobile app's SelectStockReasonBottomSheet
const ADD_REASONS = [
  { id: "NEW_PURCHASE", name: "New Purchase" },
  { id: "STOCK_CORRECTION", name: "Stock Correction (Increase)" },
  { id: "SALE_RETURN", name: "Sale Return" },
  { id: "FREE_STOCK", name: "Free Stock / Bonus" },
];

const REMOVE_REASONS = [
  { id: "DAMAGE", name: "Damaged Stock" },
  { id: "EXPIRED", name: "Expired Stock" },
  { id: "STOCK_CORRECTION", name: "Stock Correction (Decrease)" },
  { id: "INTERNAL_USE", name: "Internal Usage" },
  { id: "PURCHASE_RETURN", name: "Purchase Return" },
];

export default function AdjustStockModal({ open, onClose, item, onAdjusted }) {
  const [actionType, setActionType] = useState("add");
  const [date, setDate] = useState(todayStr());
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const reasonOptions = actionType === "add" ? ADD_REASONS : REMOVE_REASONS;

  // Reset form whenever a new item is opened
  useEffect(() => {
    if (open && item) {
      setActionType("add");
      setDate(todayStr());
      setQuantity("");
      setRate(item.costPrice ? String(item.costPrice) : "");
      setReason("");
      setRemarks("");
      setErrors({});
    }
  }, [open, item]);

  // Reset reason whenever action type changes (Add <-> Reduce have different reason sets)
  useEffect(() => {
    setReason("");
  }, [actionType]);

  if (!open || !item) return null;

  const validate = () => {
    const errs = {};
    const qtyNum = Number(quantity);
    const rateNum = Number(rate);

    if (!quantity || !Number.isInteger(qtyNum) || qtyNum <= 0) {
      errs.quantity = "Enter a valid positive whole number";
    }
    if (!rate || isNaN(rateNum) || rateNum <= 0) {
      errs.rate = "Enter a valid positive rate";
    }
    if (!reason) {
      errs.reason = "Please select a reason";
    }
    if (remarks && remarks.length > 200) {
      errs.remarks = "Remarks can be up to 200 characters";
    }
    if (!date) {
      errs.date = "Date is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const finalQuantity =
      actionType === "reduce" ? -Math.abs(Number(quantity)) : Math.abs(Number(quantity));

    const selectedReason = reasonOptions.find((r) => r.id === reason);

    const body = {
      productId: item._id,
      quantity: finalQuantity,
      rate: Number(rate),
      // ✅ backend requires this — fixed value since this endpoint is always a manual adjustment.
      // Confirm the exact enum string matches your backend schema (e.g. "ADJUSTMENT").
      transactionType: "ADJUSTMENT",
      // ✅ the actual selected reason (why the adjustment happened)
      reason: selectedReason?.id,
      reasonLabel: selectedReason?.name,
      remarks: remarks || "",
      date,
    };

    try {
      setLoading(true);
      const res = await api.post("/product/adjust-stock", body);
      if (!res?.success) throw new Error(res?.message || "Failed to adjust stock");

      toast.success(res?.message || "Stock adjusted successfully!");
      onAdjusted?.();
      onClose();
    } catch (error) {
      toast.error(error?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-bold text-[16px] text-slate-900">Adjust Stock</h3>
            <p className="text-[12.5px] text-slate-500 mt-0.5">{item.name}</p>
          </div>
          <button
            onClick={() => !loading && onClose()}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Action type */}
          <div>
            <label className="text-[12.5px] font-semibold text-slate-600 mb-1.5 block">
              Select Action
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType("add")}
                className={`flex items-center justify-center gap-1.5 h-10 rounded-lg border text-[13px] font-semibold transition-colors ${
                  actionType === "add"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Plus size={15} /> Add Stock
              </button>
              <button
                type="button"
                onClick={() => setActionType("reduce")}
                className={`flex items-center justify-center gap-1.5 h-10 rounded-lg border text-[13px] font-semibold transition-colors ${
                  actionType === "reduce"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Minus size={15} /> Reduce Stock
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-[12.5px] font-semibold text-slate-600 mb-1.5 block">
              Reason
            </label>
            <div className="relative">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                className="w-full h-10 pl-3 pr-8 rounded-lg border border-slate-200 text-[13.5px] bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="" disabled>
                  Select a reason
                </option>
                {reasonOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
            {errors.reason && <p className="text-[11.5px] text-red-600 mt-1">{errors.reason}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="text-[12.5px] font-semibold text-slate-600 mb-1.5 block">
              Adjustment Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            {errors.date && <p className="text-[11.5px] text-red-600 mt-1">{errors.date}</p>}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[12.5px] font-semibold text-slate-600 mb-1.5 block">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading}
              placeholder="Enter quantity"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            {errors.quantity && (
              <p className="text-[11.5px] text-red-600 mt-1">{errors.quantity}</p>
            )}
          </div>

          {/* Rate */}
          <div>
            <label className="text-[12.5px] font-semibold text-slate-600 mb-1.5 block">
              Cost Price
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              disabled={loading}
              placeholder="Enter cost price"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            {errors.rate && <p className="text-[11.5px] text-red-600 mt-1">{errors.rate}</p>}
          </div>

          {/* Remarks */}
          <div>
            <label className="text-[12.5px] font-semibold text-slate-600 mb-1.5 block">
              Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={loading}
              placeholder="Enter remarks"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13.5px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            {errors.remarks && (
              <p className="text-[11.5px] text-red-600 mt-1">{errors.remarks}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60 ${
              actionType === "reduce"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {actionType === "add" ? "Add Stock" : "Reduce Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
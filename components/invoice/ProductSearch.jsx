"use client";

import { Search, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ProductList({
  products,
  cartItems,
  productSearch,
  setProductSearch,
  onAdd,
  onRemove,
  onCancel,
  onConfirmAdd,
}) {
  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.hsn?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    );
  });

  const getQty = (id) => cartItems.find((p) => p._id === id)?.qty || 0;

  const totalItems = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const totalAmount = cartItems.reduce(
    (sum, i) => sum + i.qty * (i.price ?? i.sellingPrice ?? 0),
    0
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* SEARCH */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or SKU..."
              className="pl-9 h-12 rounded-xl border-slate-200 focus-visible:ring-blue-500"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="w-10 h-10 shrink-0 rounded-full bg-blue-600 flex items-center justify-center shadow-sm hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* LABEL */}
      <p className="px-4 pb-1 text-[15px] font-semibold text-slate-900">
        Items List
      </p>

      {/* PRODUCT LIST */}
      <div className="flex-1 overflow-auto pb-24">
        {filteredProducts.map((product) => {
          const qty = getQty(product._id);
          const price = product.sellingPrice ?? product.price ?? 0;
          const mrp = product.mrp ?? product.originalPrice;
          const hasDiscount = mrp && mrp > price;
          const stock = product.stock ?? 0;
          const unit = product.unit ? `per ${product.unit}` : "";

          return (
            <div
              key={product._id}
              className="flex items-center justify-between px-4 py-4 border-b border-slate-200 last:border-b-0"
            >
              {/* LEFT */}
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-medium">{product.name}</p>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-blue-600 font-semibold">
                    ₹{price.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-slate-400 line-through text-sm">
                      ₹{mrp.toFixed(2)}
                    </span>
                  )}
                  {unit && (
                    <span className="text-slate-500 text-sm">{unit}</span>
                  )}
                </div>

                <span
                  className={`inline-block mt-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                    stock > 0
                      ? "text-rose-500 border-rose-300 bg-rose-50"
                      : "text-rose-500 border-rose-300 bg-rose-50"
                  }`}
                >
                  {stock} in stock
                </span>
              </div>

              {/* RIGHT — STEPPER */}
              <div className="flex items-center bg-slate-100 rounded-full h-9 px-1 shrink-0 ml-3">
                {qty > 0 && (
                  <button
                    type="button"
                    onClick={() => onRemove(product._id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-blue-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}

                <span className="min-w-[28px] text-center text-slate-700 font-medium select-none">
                  {qty}
                </span>

                <button
                  type="button"
                  onClick={() => onAdd(product)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-blue-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-10">
            No products found
          </p>
        )}
      </div>

      {/* BOTTOM SUMMARY BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{totalItems} items</p>
          <p className="text-blue-600 font-semibold text-lg">
            ₹{totalAmount.toFixed(2)}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onCancel}
            className="text-blue-600 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmAdd}
            className="text-slate-900 font-semibold"
          >
            Add ({totalItems})
          </button>
        </div>
      </div>
    </div>
  );
}
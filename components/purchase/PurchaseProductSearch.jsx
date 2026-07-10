"use client";

import { Search, Plus, Minus, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function PurchaseProductSearch({
  products,
  cartItems,
  productSearch,
  setProductSearch,
  onAdd,
  onRemove,
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search items (name / HSN / SKU)..."
          className="pl-11 h-12 rounded-full bg-slate-100 border-none focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3 max-h-[520px] overflow-y-auto overflow-x-hidden pr-1">
        {filteredProducts.map((product) => {
          const qty = getQty(product._id);
          const costPrice = Number(product.costPrice ?? 0);
          const gstRate = Number(product.purchaseGstRate ?? product.gstRate ?? 0);

          return (
            <div
              key={product._id}
              className={`bg-white rounded-2xl border p-4 transition-all ${
                qty > 0 ? "border-blue-300 bg-blue-50/30" : "border-slate-100"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{product.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {product.category || "No Category"} · {product.unit || "Pcs"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-blue-600 font-bold text-lg">
                    ₹{costPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                    GST {gstRate}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs font-medium px-3 py-1 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
                  Stock: {product.stock ?? 0}
                </span>

                {qty === 0 ? (
                  <Button
                    size="sm"
                    onClick={() => onAdd(product)}
                    className="rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 h-8 px-4 shadow-none"
                    variant="ghost"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                    Add
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-blue-50 rounded-full px-1 py-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 rounded-full bg-white shadow-sm"
                      onClick={() => onRemove(product._id)}
                    >
                      <Minus className="w-3.5 h-3.5 text-blue-600" />
                    </Button>
                    <span className="w-5 text-center text-sm font-semibold text-blue-700">{qty}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => onAdd(product)}
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">No products found</p>
        )}
      </div>
    </div>
  );
}
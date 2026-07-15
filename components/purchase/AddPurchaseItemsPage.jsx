"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Minus, ArrowLeft, Check, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AddPurchaseItemsPage({
  products,
  cartItems,
  onAdd,
  onRemove,
  onCancel,
  onConfirm,
}) {
  const [search, setSearch] = useState("");

  const getQty = (productId) => cartItems.find((c) => c._id === productId)?.qty || 0;

  const getStock = (product) =>
    Number(product.currentStock ?? product.stock ?? product.quantity ?? 0);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.hsn?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const totalQty = cartItems.reduce((s, i) => s + (i.qty || 0), 0);
  const totalAmount = cartItems.reduce((s, i) => {
    const cost = Number(i.costPrice ?? 0);
    const discount = Number(i.purchaseDiscount ?? 0);
    return s + Math.max(0, cost - discount) * (i.qty || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 pb-28">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900">Add Purchase Items</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, HSN, or SKU..."
            className="pl-11 h-12 rounded-full bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 text-sm shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Product list */}
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const qty = getQty(product._id);
            const inCart = qty > 0;
            const stock = getStock(product);
            const costPrice = Number(product.costPrice ?? 0);

            return (
              <div
                key={product._id}
                className={`bg-white rounded-2xl border p-4 transition-all ${
                  inCart ? "border-blue-300 bg-blue-50/30 ring-1 ring-blue-100" : "border-slate-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold truncate ${inCart ? "text-blue-700" : "text-slate-800"}`}>
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {product.category?.name || product.category || "No Category"} · {product.unit || "Pcs"}
                    </p>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-blue-600 font-bold">₹{costPrice.toFixed(2)}</span>
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border bg-slate-50 text-slate-500 border-slate-200">
                        {stock} in stock
                      </span>
                    </div>
                  </div>

                  {inCart && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full shrink-0">
                      <Check className="w-3 h-3" />
                      Added
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end mt-3">
                  {!inCart ? (
                    <Button
                      size="sm"
                      onClick={() => onAdd(product)}
                      className="rounded-full bg-blue-600 hover:bg-blue-700 h-9 px-5"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 bg-blue-50 rounded-full px-1 py-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 rounded-full bg-white shadow-sm"
                        onClick={() => onRemove(product._id)}
                      >
                        <Minus className="w-4 h-4 text-blue-600" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold text-blue-700">{qty}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => onAdd(product)}
                      >
                        <Plus className="w-4 h-4 text-white" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-12">No products found</p>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span className="font-medium">{totalQty} items</span>
            <span className="text-blue-600 font-bold">₹{totalAmount.toFixed(2)}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={cartItems.length === 0} className="rounded-full px-6">
              Done ({cartItems.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
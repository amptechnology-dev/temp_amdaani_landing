"use client";

import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PurchaseCartItems({
  cartItems,
  handleUpdateQuantity,
  handleRemoveItem,
  handleClearCart,
}) {
  if (cartItems.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
          <ShoppingBag className="w-4 h-4 text-blue-600" />
          Items ({cartItems.length})
        </p>
        <button
          onClick={handleClearCart}
          className="text-xs font-medium text-rose-500 hover:text-rose-600"
        >
          Clear all
        </button>
      </div>

      {cartItems.map((item) => {
        const costPrice = Number(item.costPrice ?? 0);
        return (
          <div
            key={item._id}
            className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{item.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                ₹{costPrice.toFixed(2)} × {item.qty} ={" "}
                <span className="text-blue-600 font-semibold">
                  ₹{(costPrice * item.qty).toFixed(2)}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-blue-50 rounded-full px-1 py-1">
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 rounded-full bg-white shadow-sm"
                onClick={() => handleUpdateQuantity(item._id, item.qty - 1)}
              >
                <Minus className="w-3.5 h-3.5 text-blue-600" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold text-blue-700">
                {item.qty}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700"
                onClick={() => handleUpdateQuantity(item._id, item.qty + 1)}
              >
                <Plus className="w-3.5 h-3.5 text-white" />
              </Button>
            </div>

            <button
              onClick={() => handleRemoveItem(item._id)}
              className="w-8 h-8 flex items-center justify-center rounded-full text-rose-400 hover:bg-rose-50 hover:text-rose-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
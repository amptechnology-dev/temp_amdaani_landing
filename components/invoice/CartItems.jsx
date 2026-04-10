"use client";

import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CartItems({
  cartItems,
  handleUpdateQuantity,
  handleRemoveItem,
  handleClearCart,
}) {
  if (cartItems.length === 0) return null;

  return (
    <div className="space-y-2">
      {cartItems.map((item) => (
        <div
          key={item._id}
          className="flex items-center gap-3 p-3 border rounded-lg"
        >
          <div className="flex-1">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">
              ₹{item.price} × {item.qty}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateQuantity(item._id, item.qty - 1)}
            >
              -
            </Button>

            <Input
              className="w-14 text-center"
              value={item.qty}
              onChange={(e) =>
                handleUpdateQuantity(item._id, Number(e.target.value))
              }
            />

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdateQuantity(item._id, item.qty + 1)}
            >
              +
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRemoveItem(item._id)}
            className="text-red-600"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        className="text-red-600"
        onClick={handleClearCart}
      >
        Clear Cart
      </Button>
    </div>
  );
}

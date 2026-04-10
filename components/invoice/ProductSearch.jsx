"use client";

import { Search, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ProductList({
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
    <Card className="p-4 space-y-4">
      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search product (name / HSN / SKU)"
          className="pl-9"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
        />
      </div>

      {/* PRODUCT LIST */}
      <div className="space-y-2 max-h-[500px] overflow-auto">
        {filteredProducts.map((product) => {
          const qty = getQty(product._id);

          return (
            <div
              key={product._id}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              {/* LEFT */}
              <div className="flex-1">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  ₹{product.sellingPrice} · GST {product.gstRate || 0}%
                </p>
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-2">
                {qty > 0 && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onRemove(product._id)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}

                {qty > 0 && (
                  <span className="w-6 text-center font-medium">{qty}</span>
                )}

                <Button
                  size="icon"
                  variant={qty > 0 ? "default" : "outline"}
                  onClick={() => onAdd(product)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            No products found
          </p>
        )}
      </div>
    </Card>
  );
}

"use client";

import { Package, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/DashboardUtils";

export default function TopProducts({ products, theme }) {
  const filteredProducts = products.filter((p) => p.revenue > 0);

  return (
    <div
      onClick={() => (window.location.href = "/products")}
      className={`${theme.card} rounded-xl p-5 shadow-md cursor-pointer hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${theme.accentLight}`}>
            <Package size={20} className={theme.accent} />
          </div>
          <div>
            <h3 className={`${theme.text} text-lg font-semibold`}>
              Top 5 Products / Items
            </h3>
            <p className={`${theme.textSecondary} text-sm mt-1`}>By revenue</p>
          </div>
        </div>
        <div
          className={`text-sm px-3 py-1 rounded-full ${theme.accentLight} ${theme.accent}`}
        >
          Top Sellers
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="space-y-4">
          {filteredProducts.map((product, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b last:border-b-0"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.surfaceVariant}`}
                >
                  <span className={`${theme.text} font-medium`}>
                    {index + 1}
                  </span>
                </div>
                <div>
                  <p className={`${theme.text} font-medium`}>{product.name}</p>
                  <span className={`${theme.textSecondary} text-xs`}>
                    {product.category}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <TrendingUp size={14} className={theme.success} />
                  <span className={`${theme.text} font-medium`}>
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
                <p className={`${theme.textSecondary} text-sm mt-1`}>
                  {product.qty} sold
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Package
            size={48}
            className={`${theme.textSecondary} mx-auto mb-4 opacity-50`}
          />
          <p className={`${theme.textSecondary}`}>No product data available</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { Package } from "lucide-react";

const formatCurrency = (value) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    value || 0
  )}`;

export default function TopProducts({ products = [] }) {
  const filtered = products.filter((p) => p.revenue > 0);

  return (
    <a
      href="/dashboard/items"
      className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition-all"
    >
      <h3 className="font-bold text-slate-900 mb-3">Top 5 Products / Items</h3>
      <div className="h-px bg-slate-100 mb-2" />

      {filtered.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {filtered.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <p className="text-sm font-medium text-slate-800 truncate pr-2">
                {i + 1}. {p.name}
              </p>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-teal-600">
                  {formatCurrency(p.revenue)}
                </p>
                <p className="text-xs text-slate-400">{p.qty} sold</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-10 text-slate-400">
          <Package className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No product data available</p>
        </div>
      )}
    </a>
  );
}
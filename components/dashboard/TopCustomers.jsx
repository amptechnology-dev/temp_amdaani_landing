"use client";

import { Users } from "lucide-react";

const formatCurrency = (value) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    value || 0
  )}`;

export default function TopCustomers({ customers = [], percentage = 0 }) {
  return (
    <a
      href="/dashboard/customers"
      className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition-all"
    >
      <h3 className="font-bold text-slate-900 mb-3">Top 5 Customers</h3>
      <div className="h-px bg-slate-100 mb-2" />

      {customers.length > 0 ? (
        <>
          <div className="divide-y divide-slate-100">
            {customers.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-semibold text-slate-400 w-4 shrink-0">
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    {c.customer ? (
                      <>
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {c.customer}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {c.mobile}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-slate-800">
                        {c.mobile || "Unknown Customer"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-bold text-blue-600">
                    {c.count} invoices
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatCurrency(c.total)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-slate-400 mt-3">
            Top 5 customers = {percentage.toFixed(1)}% of invoices
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center py-10 text-slate-400">
          <Users className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No customer data available</p>
        </div>
      )}
    </a>
  );
}
"use client";

import { Check, Clock, Receipt } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecentActivity({ activities = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-900 mb-3 text-center">
        Recent Invoice Activity
      </h3>
      <div className="h-px bg-slate-100 mb-2" />

      {activities.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {activities.map((inv) => {
            const isPaid = inv.status === "paid";
            return (
             <a 
                key={inv.id}
                href={`/dashboard/sales?edit=${inv.id}`}
                className="flex items-center justify-between py-3 hover:bg-slate-50/60 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isPaid ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  >
                    {isPaid ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Clock className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">
                      {inv.invoiceNumber}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {inv.customerName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(inv.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <p className="font-bold text-blue-600 text-sm">
                    ₹{Number(inv.amount).toLocaleString("en-IN")}
                  </p>
                  <span
                    className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isPaid
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-rose-50 text-rose-600 border-rose-200"
                    }`}
                  >
                    {inv.status?.toUpperCase()}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center py-10 text-slate-400">
          <Receipt className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No recent activity</p>
        </div>
      )}
    </div>
  );
}
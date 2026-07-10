"use client";

import { AlertCircle, Wallet, Users } from "lucide-react";
import { format } from "date-fns";

const formatCurrency = (value) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    value || 0
  )}`;

export default function SummaryPanel({ dueSummary = {}, receivedSummary = {} }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900">
            Customer Due &amp; Received Summary
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Current Month Overview · {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      <div className="h-px bg-slate-100 mb-4" />

      <div className="grid grid-cols-2 divide-x divide-slate-100">
        {/* Due */}
        <a
          href="/dashboard/customers?tab=due"
          className="flex flex-col items-center text-center px-2 hover:opacity-80 transition-opacity"
        >
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 text-xs font-semibold px-3 py-1 rounded-full border border-rose-200 mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Total Outstanding
          </span>
          <p className="text-xl font-extrabold text-rose-600">
            {formatCurrency(dueSummary.totalDue)}
          </p>
          <div className="mt-1 text-xs text-slate-400">
            {dueSummary.totalCustomers > 0 && (
              <p>{dueSummary.totalCustomers} customers</p>
            )}
            {dueSummary.totalPendingInvoices > 0 && (
              <p>{dueSummary.totalPendingInvoices} invoices</p>
            )}
          </div>
        </a>

        {/* Received */}
        <a
          href="/dashboard/transactions"
          className="flex flex-col items-center text-center px-2 hover:opacity-80 transition-opacity"
        >
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200 mb-2">
            <Wallet className="w-3.5 h-3.5" />
            Received
          </span>
          <p className="text-xl font-extrabold text-blue-600">
            {formatCurrency(receivedSummary.totalReceived)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Received this month</p>
        </a>
      </div>
    </div>
  );
}
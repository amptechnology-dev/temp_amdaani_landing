"use client";

import { AlertCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/DashboardUtils";

export default function SummaryPanel({ dueSummary, receivedSummary, theme }) {
  return (
    <div className={`${theme.card} rounded-xl p-6 shadow-md`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`${theme.text} text-lg font-semibold`}>
            Customer Due & Received Summary
          </h3>
          <p className={`${theme.textSecondary} text-sm mt-1`}>
            Current Month Overview
          </p>
        </div>
        <div className={`p-3 rounded-lg ${theme.accentLight}`}>
          <DollarSign size={24} className={theme.accent} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Due Section */}
        <div
          onClick={() => (window.location.href = "/customers?tab=due")}
          className={`${theme.surfaceVariant} rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center space-x-2 mb-4">
            <div className={`p-2 rounded-lg ${theme.error} bg-opacity-10`}>
              <AlertCircle size={20} className={theme.error} />
            </div>
            <span className={`${theme.error} font-medium`}>
              Total Outstanding
            </span>
          </div>
          <div className={`${theme.text} text-2xl font-bold mb-2`}>
            {formatCurrency(dueSummary?.totalDue || 0)}
          </div>
          <div className="space-y-1">
            {dueSummary?.totalCustomers > 0 && (
              <p className={`${theme.textSecondary} text-sm`}>
                {dueSummary.totalCustomers} customers
              </p>
            )}
            {dueSummary?.totalPendingInvoices > 0 && (
              <p className={`${theme.textSecondary} text-sm`}>
                {dueSummary.totalPendingInvoices} invoices
              </p>
            )}
          </div>
        </div>

        {/* Received Section */}
        <div
          onClick={() => (window.location.href = "/transactions")}
          className={`${theme.surfaceVariant} rounded-lg p-5 cursor-pointer hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center space-x-2 mb-4">
            <div className={`p-2 rounded-lg ${theme.accent} bg-opacity-10`}>
              <DollarSign size={20} className={theme.accent} />
            </div>
            <span className={`${theme.accent} font-medium`}>Received</span>
          </div>
          <div className={`${theme.text} text-2xl font-bold mb-2`}>
            {formatCurrency(receivedSummary?.totalReceived || 0)}
          </div>
          <p className={`${theme.textSecondary} text-sm`}>
            Received this month
          </p>
        </div>
      </div>
    </div>
  );
}

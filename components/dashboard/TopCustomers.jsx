"use client";

import { Users, Phone, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/DashboardUtils";

export default function TopCustomers({ customers, percentage, theme }) {
  return (
    <div
      onClick={() => (window.location.href = "/customers")}
      className={`${theme.card} rounded-xl p-5 shadow-md cursor-pointer hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${theme.accentLight}`}>
            <Users size={20} className={theme.accent} />
          </div>
          <div>
            <h3 className={`${theme.text} text-lg font-semibold`}>
              Top 5 Customers
            </h3>
            <p className={`${theme.textSecondary} text-sm mt-1`}>
              By invoice count
            </p>
          </div>
        </div>
        <div
          className={`text-sm px-3 py-1 rounded-full ${theme.accentLight} ${theme.accent}`}
        >
          {percentage.toFixed(1)}%
        </div>
      </div>

      {customers.length > 0 ? (
        <div className="space-y-4">
          {customers.map((customer, index) => (
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
                  <p className={`${theme.text} font-medium`}>
                    {customer.customer || customer.mobile || "Unknown Customer"}
                  </p>
                  {customer.mobile && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Phone size={12} className={theme.textSecondary} />
                      <span className={`${theme.textSecondary} text-xs`}>
                        {customer.mobile}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <FileText size={14} className={theme.textSecondary} />
                  <span className={`${theme.text} font-medium`}>
                    {customer.count} invoices
                  </span>
                </div>
                <p className={`${theme.textSecondary} text-sm mt-1`}>
                  {formatCurrency(customer.total)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Users
            size={48}
            className={`${theme.textSecondary} mx-auto mb-4 opacity-50`}
          />
          <p className={`${theme.textSecondary}`}>No customer data available</p>
        </div>
      )}
    </div>
  );
}

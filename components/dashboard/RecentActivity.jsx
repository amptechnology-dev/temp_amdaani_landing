"use client";

import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/DashboardUtils";
export default function RecentActivity({ activities, theme }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircle size={16} className="text-green-500" />;
      case "pending":
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <AlertCircle size={16} className="text-red-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className={`${theme.card} rounded-xl p-5 shadow-md`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${theme.accentLight}`}>
            <FileText size={20} className={theme.accent} />
          </div>
          <div>
            <h3 className={`${theme.text} text-lg font-semibold`}>
              Recent Invoice Activity
            </h3>
            <p className={`${theme.textSecondary} text-sm mt-1`}>
              Latest transactions
            </p>
          </div>
        </div>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              onClick={() =>
                (window.location.href = `/invoices/${activity.id}`)
              }
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${theme.surfaceVariant}`}>
                  {getStatusIcon(activity.status)}
                </div>
                <div>
                  <p className={`${theme.text} font-medium`}>
                    {activity.invoiceNumber}
                  </p>
                  <p className={`${theme.textSecondary} text-sm mt-1`}>
                    {activity.customerName}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Clock size={12} className={theme.textTertiary} />
                    <span className={`${theme.textTertiary} text-xs`}>
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`${theme.text} font-bold text-lg`}>
                  {formatCurrency(activity.amount)}
                </div>
                <div
                  className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    activity.status
                  )}`}
                >
                  {activity.status.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <FileText
            size={48}
            className={`${theme.textSecondary} mx-auto mb-4 opacity-50`}
          />
          <p className={`${theme.textSecondary}`}>No recent activity</p>
        </div>
      )}
    </div>
  );
}

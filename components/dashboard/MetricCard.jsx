"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/DashboardUtils";
export default function MetricCard({
  title,
  value,
  previousValue,
  growth,
  count,
  period,
  icon,
  color,
  theme,
  onClick,
}) {
  const getIconColor = () => {
    switch (color) {
      case "primary":
        return theme.accent;
      case "secondary":
        return theme.secondary;
      case "tertiary":
        return theme.tertiary;
      case "error":
        return theme.error;
      default:
        return theme.accent;
    }
  };

  const getGrowthColor = () => {
    if (growth > 0) return theme.success;
    if (growth < 0) return theme.error;
    return theme.textTertiary;
  };

  const getPeriodText = () => {
    switch (period) {
      case "year":
        return "vs last year";
      case "month":
        return "vs last month";
      case "week":
        return "vs last week";
      case "day":
        return "vs yesterday";
      default:
        return "";
    }
  };

  const iconColor = getIconColor() || "text-blue-500"; // fallback ALWAYS defined
  const bgColor = iconColor.replace("text-", "bg-");

  return (
    <div
      onClick={onClick}
      className={`
        ${theme.card} rounded-xl p-5 shadow-md hover:shadow-lg
        transition-all duration-200 cursor-pointer
        border ${theme.outline}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${bgColor} bg-opacity-10`}>
            {/* Icon would go here - using Lucide icons */}
          </div>
          <span className={`${theme.textSecondary} text-sm font-medium`}>
            {title}
          </span>
        </div>
        <div className="text-xs px-2 py-1 rounded-full bg-opacity-10 bg-gray-500">
          {period}
        </div>
      </div>

      <div className="mb-3">
        <div className={`${theme.text} text-2xl font-bold mb-1`}>
          {formatCurrency(value)}
        </div>
        {growth !== undefined && (
          <div className="flex items-center space-x-1">
            {growth > 0 ? (
              <TrendingUp size={16} className={theme.success} />
            ) : growth < 0 ? (
              <TrendingDown size={16} className={theme.error} />
            ) : null}
            <span className={`text-sm font-medium ${getGrowthColor()}`}>
              {growth > 0 ? "+" : ""}
              {growth?.toFixed(1)}%
            </span>
            <span className={`${theme.textTertiary} text-sm`}>
              {getPeriodText()}
            </span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-opacity-20">
        <div className="flex justify-between items-center">
          <span className={`${theme.textTertiary} text-sm`}>
            {count} invoices
          </span>
          {previousValue > 0 && (
            <span className={`${theme.textSecondary} text-sm`}>
              Prev: {formatCurrency(previousValue)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

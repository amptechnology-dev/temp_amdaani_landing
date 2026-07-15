"use client";

import {
  CalendarRange,
  CalendarDays,
  Calendar,
  CalendarClock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const iconMap = {
  calendar: CalendarRange,
  calendarMonth: CalendarDays,
  calendarWeek: Calendar,
  calendarToday: CalendarClock,
};

const colorMap = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  teal: { bg: "bg-teal-50", text: "text-teal-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  rose: { bg: "bg-rose-50", text: "text-rose-600" },
};

const abbreviate = (value) => {
  if (value >= 1e7) return (value / 1e7).toFixed(2).replace(/\.00$/, "") + " Cr";
  if (value >= 1e5) return (value / 1e5).toFixed(2).replace(/\.00$/, "") + " L";
  return new Intl.NumberFormat("en-IN").format(value);
};

const formatCurrency = (value) => `₹${abbreviate(value)}`;

export default function MetricCard({
  title,
  value,
  growth,
  count,
  avg,
  max,
  subtitle,
  icon,
  color = "blue",
  onClick,
}) {
  const Icon = iconMap[icon] || Calendar;
  const c = colorMap[color] || colorMap.blue;
  const hasGrowth = typeof growth === "number" && subtitle;
  const isPositive = growth >= 0;

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
        <span className="text-xs font-medium text-slate-500">{title}</span>
      </div>

      <p className="text-2xl font-bold text-slate-900 mb-1.5 truncate">
        {formatCurrency(value)}
      </p>

      {hasGrowth ? (
        <p
          className={`text-xs font-medium flex items-center gap-1 ${
            isPositive ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {isPositive ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )}
          {Math.abs(growth).toFixed(1)}% {subtitle} · {count} invoices
        </p>
      ) : avg !== undefined ? (
        <p className="text-xs font-medium text-amber-600">
          Across {count} invoices · Avg {formatCurrency(avg)}
        </p>
      ) : max !== undefined ? (
        <p className="text-xs font-medium text-rose-500">
          {count} invoices · Max {formatCurrency(max)}
        </p>
      ) : (
        <p className="text-xs font-medium text-slate-400">{count} invoices</p>
      )}
    </button>
  );
}
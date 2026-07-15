"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const abbreviate = (value) => {
  if (value >= 1e7) return (value / 1e7).toFixed(1).replace(/\.0$/, "") + "Cr";
  if (value >= 1e5) return (value / 1e5).toFixed(1).replace(/\.0$/, "") + "L";
  if (value >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return value;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-100 px-3 py-2">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="text-xs text-blue-600 font-medium">
        ₹{Number(payload[0].value).toLocaleString("en-IN")}
      </p>
    </div>
  );
};

export default function ChartCard({
  title,
  subtitle,
  type = "bar",
  data = [],
  height = 260,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="mb-3">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>

      {data.length === 0 ? (
        <div
          style={{ height }}
          className="flex items-center justify-center text-sm text-slate-400"
        >
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {type === "bar" ? (
            <BarChart data={data} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v) => `₹${abbreviate(v)}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v) => `₹${abbreviate(v)}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#lineFill)"
                dot={{ r: 3, fill: "#2563eb" }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
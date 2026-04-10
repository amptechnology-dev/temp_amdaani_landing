"use client";

import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

export default function ChartCard({
  title,
  subtitle,
  type,
  data,
  theme,
  height = 300,
}) {
  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        label: "Value",
        data: data.map((d) => d.value),
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "#3b82f6",
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className={`${theme.card} rounded-xl p-5 shadow-md`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h3 className={`${theme.text} text-lg font-semibold`}>{title}</h3>
          {subtitle && (
            <p className={`${theme.textSecondary} text-sm mt-1`}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        {type === "bar" ? (
          <Bar data={chartData} options={{ responsive: true }} />
        ) : (
          <Line data={chartData} options={{ responsive: true }} />
        )}
      </div>
    </div>
  );
}

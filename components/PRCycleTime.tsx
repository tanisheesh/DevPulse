"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  average: number;
  median: number;
  trend: { week: string; avgDays: number }[];
  total: number;
}

export default function PRCycleTime({ average, median, trend, total }: Props) {
  if (total === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary text-sm">No merged PRs found yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          PR Cycle Time
        </p>
        <p className="text-xs text-tertiary">{total} merged PRs</p>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="glass-subtle rounded-xl px-4 py-3 flex-1 text-center">
          <p className="text-2xl font-bold heading text-primary">{average.toFixed(1)}</p>
          <p className="text-xs text-secondary mt-0.5">avg days</p>
        </div>
        <div className="glass-subtle rounded-xl px-4 py-3 flex-1 text-center">
          <p className="text-2xl font-bold heading text-primary">{median.toFixed(1)}</p>
          <p className="text-xs text-secondary mt-0.5">median days</p>
        </div>
      </div>

      {trend.length > 1 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 9, fill: "#8B929D" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "rgba(10,15,35,0.9)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.85)",
                }}
                formatter={(v) => [`${(v as number).toFixed(1)} days`, "Avg cycle"]}
              />
              <ReferenceLine
                y={average}
                stroke="rgba(10,132,255,0.4)"
                strokeDasharray="4 4"
              />
              <Line
                type="monotone"
                dataKey="avgDays"
                stroke="#BF5AF2"
                strokeWidth={2}
                dot={{ r: 3, fill: "#BF5AF2", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

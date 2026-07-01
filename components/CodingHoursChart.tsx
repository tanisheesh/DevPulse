"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  data: { hour: number; count: number }[];
  workStartHour: number;
  workEndHour: number;
}

function hourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

export default function CodingHoursChart({ data, workStartHour, workEndHour }: Props) {
  const peakHour = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);

  const chartData = data.map((d) => ({
    ...d,
    label: hourLabel(d.hour),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          Coding Hours
        </p>
        {peakHour?.count > 0 && (
          <p className="text-xs text-tertiary">
            Peak: {hourLabel(peakHour.hour)} ({peakHour.count} commits)
          </p>
        )}
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap={2}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#8B929D" }}
              interval={2}
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
              formatter={(v, _, p) => [`${v} commits`, hourLabel(p.payload.hour)]}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {chartData.map((entry) => {
                const isWork = entry.hour >= workStartHour && entry.hour < workEndHour;
                return (
                  <Cell
                    key={entry.hour}
                    fill={isWork ? "rgba(10,132,255,0.7)" : "rgba(191,90,242,0.5)"}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 mt-1.5 justify-end">
        <div className="flex items-center gap-1.5 text-[10px] text-tertiary">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(10,132,255,0.7)" }} />
          Work hours
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-tertiary">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(191,90,242,0.5)" }} />
          After hours
        </div>
      </div>
    </div>
  );
}

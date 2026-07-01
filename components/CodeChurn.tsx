"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { week: string; additions: number; deletions: number }[];
}

export default function CodeChurn({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary text-sm">No commit data to show churn.</p>
      </div>
    );
  }

  const totalAdd = data.reduce((s, d) => s + d.additions, 0);
  const totalDel = data.reduce((s, d) => s + d.deletions, 0);
  const ratio = totalDel > 0 ? (totalDel / totalAdd).toFixed(2) : "0";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          Code Churn
        </p>
        <p className="text-xs text-tertiary">
          +{totalAdd.toLocaleString()} / -{totalDel.toLocaleString()} · {ratio}x churn ratio
        </p>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={6}>
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
              formatter={(v, name) => [`${(v as number).toLocaleString()} lines`, name]}
            />
            <Bar dataKey="additions" name="Additions" fill="rgba(48,209,88,0.65)" radius={[3,3,0,0]} />
            <Bar dataKey="deletions" name="Deletions" fill="rgba(255,69,58,0.55)" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

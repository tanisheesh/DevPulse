"use client";

import { BurnoutSnapshot } from "@prisma/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Info, Moon, Calendar } from "lucide-react";

interface Props {
  snapshot: BurnoutSnapshot | null;
  history: BurnoutSnapshot[];
}

type Level = "high" | "moderate" | "healthy";

function getLevel(score: number): Level {
  if (score >= 75) return "high";
  if (score >= 50) return "moderate";
  return "healthy";
}

const LEVEL_CONFIG = {
  high:     { label: "High risk",   color: "#FF453A", glow: "rgba(255,69,58,0.25)",   Icon: AlertTriangle,  chartColor: "#FF453A" },
  moderate: { label: "Moderate",    color: "#FF9F0A", glow: "rgba(255,159,10,0.25)",  Icon: Info,           chartColor: "#FF9F0A" },
  healthy:  { label: "Healthy",     color: "#30D158", glow: "rgba(48,209,88,0.25)",   Icon: CheckCircle2,   chartColor: "#30D158" },
};

export default function BurnoutCard({ snapshot, history }: Props) {
  const chartData = history.map((s) => ({
    date: format(new Date(s.date), "MMM d"),
    score: s.score,
  }));

  const score = snapshot?.score ?? null;
  const level = score !== null ? getLevel(score) : null;
  const cfg = level ? LEVEL_CONFIG[level] : null;

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Burnout Score</p>
        {cfg && (
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: `${cfg.color}18`,
              border: `1px solid ${cfg.color}40`,
              color: cfg.color,
            }}
          >
            <cfg.Icon size={11} />
            {cfg.label}
          </div>
        )}
      </div>

      {score !== null && cfg ? (
        <>
          {/* Score display */}
          <div className="flex items-end gap-2 mb-3">
            <span
              className="text-7xl font-bold heading"
              style={{ color: cfg.color, textShadow: `0 0 40px ${cfg.glow}` }}
            >
              {score}
            </span>
            <span className="text-secondary mb-3 text-lg">/100</span>
          </div>

          {/* Explanation */}
          {snapshot?.explanation && (
            <p className="text-secondary text-sm leading-relaxed mb-5">
              {snapshot.explanation}
            </p>
          )}

          {/* Breakdown */}
          <div className="flex gap-4 mb-6">
            <div className="glass-subtle rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-secondary">
              <Moon size={12} style={{ color: "#BF5AF2" }} />
              {snapshot?.lateNightCommitCount} late-night
            </div>
            <div className="glass-subtle rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-secondary">
              <Calendar size={12} style={{ color: "#FF9F0A" }} />
              {snapshot?.weekendCommitCount} weekend
            </div>
            <div className="glass-subtle rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-secondary">
              <span className="font-mono">#</span>
              {snapshot?.totalCommitCount} total
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="h-32 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#8B929D" }}
                    axisLine={false}
                    tickLine={false}
                    hide={chartData.length > 14}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,20,40,0.85)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(20px)",
                    }}
                    formatter={(v) => [`${v}`, "Score"]}
                  />
                  <ReferenceLine y={75} stroke="rgba(255,69,58,0.4)" strokeDasharray="3 3" />
                  <ReferenceLine y={50} stroke="rgba(255,159,10,0.4)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={cfg.chartColor}
                    strokeWidth={2.5}
                    dot={false}
                    style={{ filter: `drop-shadow(0 0 6px ${cfg.color})` }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div className="py-10 text-center">
          <p className="text-secondary text-sm">No burnout data yet.</p>
          <p className="text-tertiary text-xs mt-1 mb-3">
            Select repos → click Sync now → come back here.
          </p>
          <a
            href="/dashboard/repos"
            className="inline-block text-sm font-medium"
            style={{ color: "#0A84FF" }}
          >
            Go to Repositories →
          </a>
        </div>
      )}
    </div>
  );
}

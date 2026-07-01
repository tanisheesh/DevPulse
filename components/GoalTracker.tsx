"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Sparkles, Target, AlertCircle } from "lucide-react";

type GoalType = "commits" | "prs" | "issues";

interface Goal {
  id: string;
  type: string;
  target: number;
}

interface Props {
  goals: Goal[];
  actuals: Record<GoalType, number>;
  checkIn: string | null;
}

const TYPE_META: Record<GoalType, { label: string; color: string }> = {
  commits:  { label: "Commits",      color: "#0A84FF" },
  prs:      { label: "Pull Requests", color: "#BF5AF2" },
  issues:   { label: "Issues",        color: "#30D158" },
};

export default function GoalTracker({ goals, actuals, checkIn: initialCheckIn }: Props) {
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<GoalType>("commits");
  const [newTarget, setNewTarget] = useState(5);
  const [loading, setLoading] = useState(false);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function addGoal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType, target: newTarget }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to add goal.");
        return;
      }
      setAdding(false);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteGoal(id: string) {
    setError(null);
    try {
      const res = await fetch("/api/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to delete goal.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    }
  }

  async function generateCheckIn() {
    setCheckInLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/goals/checkin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to generate check-in.");
        return;
      }
      setCheckIn(data.content);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setCheckInLoading(false);
    }
  }

  const availableTypes = (["commits", "prs", "issues"] as GoalType[]).filter(
    (t) => !goals.some((g) => g.type === t)
  );

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,69,58,0.10)", border: "1px solid rgba(255,69,58,0.25)", color: "#FF453A" }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 && !adding ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}
        >
          <Target size={24} className="mx-auto mb-2 text-tertiary" />
          <p className="text-secondary text-sm">No goals for this week yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const meta = TYPE_META[goal.type as GoalType] ?? { label: goal.type, color: "#8B929D" };
            const actual = actuals[goal.type as GoalType] ?? 0;
            const pct = Math.min(100, Math.round((actual / goal.target) * 100));
            const met = actual >= goal.target;

            return (
              <div key={goal.id} className="glass-subtle rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{meta.label}</span>
                    {met && (
                      <span
                        className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                        style={{ background: "rgba(48,209,88,0.2)", color: "#30D158" }}
                      >
                        MET
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary">
                      {actual} / {goal.target}
                    </span>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="text-tertiary hover:text-primary transition p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: met ? "#30D158" : meta.color,
                      boxShadow: `0 0 8px ${met ? "rgba(48,209,88,0.5)" : meta.color + "66"}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add goal */}
      {adding ? (
        <div className="glass-subtle rounded-xl p-4 space-y-3">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as GoalType)}
            className="glass-input w-full rounded-xl px-3 py-2 text-sm"
          >
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {TYPE_META[t].label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={999}
              value={newTarget}
              onChange={(e) => setNewTarget(parseInt(e.target.value) || 1)}
              className="glass-input rounded-xl px-3 py-2 text-sm w-24"
            />
            <span className="text-secondary text-sm">this week</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addGoal}
              disabled={loading || availableTypes.length === 0}
              className="btn-primary flex-1 rounded-xl py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Adding…" : "Add goal"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="btn-glass flex-1 rounded-xl py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        availableTypes.length > 0 && (
          <button
            onClick={() => { setAdding(true); setNewType(availableTypes[0]); }}
            className="btn-glass w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm text-secondary"
          >
            <Plus size={14} />
            Add goal
          </button>
        )
      )}

      {/* AI check-in */}
      {goals.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              AI Check-in
            </p>
            <button
              onClick={generateCheckIn}
              disabled={checkInLoading}
              className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              <Sparkles size={11} className={checkInLoading ? "animate-pulse" : ""} />
              {checkIn ? "Refresh" : "Generate"}
            </button>
          </div>
          {checkIn ? (
            <p className="text-secondary text-sm leading-relaxed">{checkIn}</p>
          ) : (
            <p className="text-tertiary text-xs">Click Generate for an AI progress summary.</p>
          )}
        </div>
      )}
    </div>
  );
}

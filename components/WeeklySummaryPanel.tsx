"use client";

import { WeeklySummary } from "@prisma/client";
import { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

export default function WeeklySummaryPanel({ initialSummary }: { initialSummary: WeeklySummary | null }) {
  const [summary, setSummary] = useState<WeeklySummary | null>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/summary/weekly", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to generate summary. Try again.");
        return;
      }
      setSummary(data);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-1">
            Weekly Summary
          </p>
          <p className="text-xs text-tertiary">
            {format(weekStart, "MMM d")}–{format(weekEnd, "MMM d")}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50"
        >
          {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {summary ? "Regenerate" : "Generate summary"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: "rgba(255,69,58,0.10)", border: "1px solid rgba(255,69,58,0.25)", color: "#FF453A" }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {summary ? (
        <div>
          <p className="text-primary text-sm leading-relaxed whitespace-pre-wrap">{summary.content}</p>
          <p className="text-tertiary text-xs mt-4">
            Generated {format(new Date(summary.generatedAt), "MMM d 'at' h:mm a")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl p-10 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <Sparkles size={24} className="mx-auto mb-3 text-tertiary" />
          <p className="text-secondary text-sm">
            Sync your repos first, then click <strong className="text-primary">Generate summary</strong> for
            this week&apos;s AI narrative.
          </p>
        </div>
      )}
    </div>
  );
}

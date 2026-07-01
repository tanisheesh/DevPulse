"use client";

import { MonthlyReview } from "@prisma/client";
import { useState } from "react";
import { Sparkles, RefreshCw, Copy, Check, AlertCircle } from "lucide-react";
import { format, startOfMonth } from "date-fns";

export default function MonthlyReviewPanel({ initialReview }: { initialReview: MonthlyReview | null }) {
  const [review, setReview] = useState<MonthlyReview | null>(initialReview);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/monthly-review", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to generate review. Try again.");
        return;
      }
      setReview(data);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!review) return;
    await navigator.clipboard.writeText(review.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const monthLabel = format(startOfMonth(new Date()), "MMMM yyyy");

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-1">
            Monthly Review
          </p>
          <p className="text-xs text-tertiary">{monthLabel} · Performance review draft</p>
        </div>
        <div className="flex items-center gap-2">
          {review && (
            <button onClick={copy}
              className="btn-glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-secondary">
              {copied ? <Check size={13} style={{ color: "#30D158" }} /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
          <button onClick={generate} disabled={loading}
            className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50">
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {review ? "Regenerate" : "Generate review"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm"
          style={{ background: "rgba(255,69,58,0.10)", border: "1px solid rgba(255,69,58,0.25)", color: "#FF453A" }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {review ? (
        <div>
          <p className="text-primary text-sm leading-relaxed whitespace-pre-wrap">{review.content}</p>
          <p className="text-tertiary text-xs mt-4">
            Generated {format(new Date(review.generatedAt), "MMM d 'at' h:mm a")} · Paste directly into your perf tool
          </p>
        </div>
      ) : (
        <div className="rounded-xl p-8 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <Sparkles size={22} className="mx-auto mb-2 text-tertiary" />
          <p className="text-secondary text-sm">
            Click <strong className="text-primary">Generate review</strong> to get a professional
            performance summary from this month&apos;s GitHub activity.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { StandupReport } from "@prisma/client";
import { useState } from "react";
import { Sparkles, RefreshCw, Copy, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function StandupPanel({ initialReport }: { initialReport: StandupReport | null }) {
  const [report, setReport] = useState<StandupReport | null>(initialReport);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState(initialReport?.content ?? "");

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/standup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to generate standup. Try again.");
        return;
      }
      setReport(data);
      setEditedContent(data.content);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-1">
            Standup Report
          </p>
          {report && (
            <p className="text-xs text-tertiary">
              Generated at {format(new Date(report.generatedAt), "h:mm a")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <button
              onClick={copy}
              className="btn-glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-secondary"
            >
              {copied ? <Check size={13} style={{ color: "#30D158" }} /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-50"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {report ? "Regenerate" : "Generate standup"}
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

      {report ? (
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="glass-input w-full text-sm rounded-xl p-4 resize-none font-mono leading-relaxed text-primary"
          rows={12}
          style={{ minHeight: 240 }}
        />
      ) : (
        <div className="rounded-xl p-10 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <Sparkles size={24} className="mx-auto mb-3 text-tertiary" />
          <p className="text-secondary text-sm">
            Click <strong className="text-primary">Generate standup</strong> to produce today&apos;s
            report from yesterday&apos;s commits, PRs, and issues.
          </p>
        </div>
      )}
    </div>
  );
}

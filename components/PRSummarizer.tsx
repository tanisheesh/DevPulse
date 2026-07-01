"use client";

import { PullRequestRecord, Repository } from "@prisma/client";
import { useState } from "react";
import { Sparkles, ExternalLink, AlertCircle } from "lucide-react";

type PRWithRepo = PullRequestRecord & { repo: Pick<Repository, "owner" | "name" | "fullName"> };

interface Props {
  prs: PRWithRepo[];
}

export default function PRSummarizer({ prs }: Props) {
  const [selectedId, setSelectedId] = useState<string>(prs[0]?.id ?? "");
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = prs.find((p) => p.id === selectedId);

  async function summarize() {
    if (!selected) return;
    setLoading(true);
    setSummary(null);
    setError(null);
    try {
      const res = await fetch("/api/pr-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: selected.repo.owner,
          repo: selected.repo.name,
          number: selected.number,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to summarize PR.");
        return;
      }
      setSummary(data.summary);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (prs.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-secondary text-sm">No PRs found. Sync repos with PR data first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setSummary(null); setError(null); }}
          className="glass-input flex-1 rounded-xl px-3 py-2.5 text-sm"
        >
          {prs.map((pr) => (
            <option key={pr.id} value={pr.id}>
              #{pr.number} · {pr.repo.fullName} · {pr.title.slice(0, 50)}
            </option>
          ))}
        </select>
        <button
          onClick={summarize}
          disabled={loading || !selected}
          className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50 shrink-0"
        >
          <Sparkles size={14} className={loading ? "animate-pulse" : ""} />
          {loading ? "Summarizing…" : "Summarize"}
        </button>
      </div>

      {selected && (
        <div className="glass-subtle rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary truncate">{selected.title}</p>
            <p className="text-xs text-tertiary mt-0.5">
              {selected.repo.fullName} · #{selected.number} ·{" "}
              <span
                className="font-medium"
                style={{
                  color:
                    selected.state === "merged"
                      ? "#BF5AF2"
                      : selected.state === "open"
                      ? "#30D158"
                      : "rgba(255,255,255,0.4)",
                }}
              >
                {selected.state}
              </span>
            </p>
          </div>
          {selected.url && (
            <a
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-tertiary hover:text-primary transition"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,69,58,0.10)", border: "1px solid rgba(255,69,58,0.25)", color: "#FF453A" }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {summary && (
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-2">
            AI Summary
          </p>
          <p className="text-primary text-sm leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}

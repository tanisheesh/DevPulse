"use client";

import { useState } from "react";
import { RefreshCw, Check, Download, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  reposExist: boolean;
  hasSelectedRepos: boolean;
}

export default function SyncButton({ reposExist, hasSelectedRepos }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setStatus("idle");
    setErrorMsg("");
    try {
      let res: Response;
      if (!reposExist) {
        res = await fetch("/api/repos");
      } else {
        res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lookbackDays: 30 }),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body?.error ?? `Error ${res.status}`);
        setStatus("error");
        return;
      }

      setStatus("done");
      router.refresh();
      setTimeout(() => setStatus("idle"), 3500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || (reposExist && !hasSelectedRepos);

  const label =
    loading
      ? reposExist ? "Syncing…" : "Importing…"
      : status === "done"
      ? reposExist ? "Synced!" : "Imported!"
      : status === "error"
      ? "Failed"
      : reposExist
      ? "Sync now"
      : "Import repos";

  const Icon =
    loading
      ? RefreshCw
      : status === "done"
      ? Check
      : status === "error"
      ? AlertCircle
      : reposExist
      ? RefreshCw
      : Download;

  const iconColor =
    status === "done" ? "#30D158" : status === "error" ? "#FF453A" : undefined;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleClick}
        disabled={disabled}
        title={reposExist && !hasSelectedRepos ? "Select at least one repo first" : undefined}
        className="btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        <Icon
          size={15}
          className={loading ? "animate-spin" : ""}
          style={iconColor ? { color: iconColor } : undefined}
        />
        {label}
      </button>
      {status === "error" && errorMsg && (
        <p className="text-xs" style={{ color: "#FF453A" }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

"use client";

import { Repository } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Globe, Search } from "lucide-react";
import { format } from "date-fns";

type FilterTab = "all" | "mine" | "collab";

interface Props {
  repos: Repository[];
  userLogin: string | null;
}

export default function RepoSelector({ repos, userLogin }: Props) {
  const [toggling, setToggling] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const router = useRouter();

  async function toggle(repo: Repository) {
    setToggling(repo.id);
    await fetch("/api/repos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId: repo.id, selectedForSync: !repo.selectedForSync }),
    });
    router.refresh();
    setToggling(null);
  }

  const myRepos = repos.filter((r) =>
    userLogin ? r.owner === userLogin : true
  );
  const collabRepos = repos.filter((r) =>
    userLogin ? r.owner !== userLogin : false
  );

  const tabRepos =
    tab === "mine" ? myRepos : tab === "collab" ? collabRepos : repos;

  const filtered = tabRepos.filter((r) =>
    r.fullName.toLowerCase().includes(query.toLowerCase())
  );

  const selectedCount = repos.filter((r) => r.selectedForSync).length;

  const TABS: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: repos.length },
    { id: "mine", label: "My repos", count: myRepos.length },
    { id: "collab", label: "Collaborating", count: collabRepos.length },
  ];

  return (
    <div className="glass rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            Select repos to track
          </p>
          <p className="text-xs text-tertiary mt-0.5">
            {selectedCount} of {repos.length} selected
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      {userLogin && (
        <div className="flex gap-1.5 mb-4 p-1 rounded-xl glass-subtle w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background:
                  tab === t.id
                    ? "rgba(10,132,255,0.2)"
                    : "transparent",
                color:
                  tab === t.id
                    ? "#0A84FF"
                    : "rgba(255,255,255,0.45)",
                border:
                  tab === t.id
                    ? "1px solid rgba(10,132,255,0.3)"
                    : "1px solid transparent",
              }}
            >
              {t.label}
              <span
                className="rounded-full px-1.5 py-0 text-[10px]"
                style={{
                  background:
                    tab === t.id
                      ? "rgba(10,132,255,0.25)"
                      : "rgba(255,255,255,0.08)",
                  color:
                    tab === t.id ? "#0A84FF" : "rgba(255,255,255,0.4)",
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary"
        />
        <input
          type="text"
          placeholder="Filter repositories…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm"
        />
      </div>

      {/* List */}
      <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <li className="text-center py-10 text-secondary text-sm">
            No repos match your filter.
          </li>
        ) : (
          filtered.map((repo) => {
            const isLoading = toggling === repo.id;
            const isOwn = userLogin ? repo.owner === userLogin : null;

            return (
              <li
                key={repo.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                style={{
                  background: repo.selectedForSync
                    ? "rgba(10,132,255,0.08)"
                    : "rgba(255,255,255,0.03)",
                  border: repo.selectedForSync
                    ? "1px solid rgba(10,132,255,0.2)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {repo.isPrivate ? (
                  <Lock size={13} className="text-tertiary shrink-0" />
                ) : (
                  <Globe size={13} className="text-tertiary shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm text-primary truncate font-medium"
                      title={repo.fullName}
                    >
                      {repo.fullName}
                    </p>
                    {isOwn === false && (
                      <span
                        className="shrink-0 text-[10px] font-medium rounded-full px-1.5 py-0.5"
                        style={{
                          background: "rgba(191,90,242,0.15)",
                          color: "#BF5AF2",
                          border: "1px solid rgba(191,90,242,0.25)",
                        }}
                      >
                        collab
                      </span>
                    )}
                  </div>
                  {repo.lastSyncedAt && (
                    <p className="text-xs text-tertiary mt-0.5">
                      Synced {format(new Date(repo.lastSyncedAt), "MMM d")}
                    </p>
                  )}
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggle(repo)}
                  disabled={isLoading}
                  aria-label={
                    repo.selectedForSync ? "Remove from sync" : "Add to sync"
                  }
                  className="shrink-0 relative"
                >
                  <span
                    className="toggle-track block w-11 h-6 rounded-full"
                    style={{
                      background: repo.selectedForSync
                        ? "linear-gradient(135deg, #0A84FF, #006EDB)"
                        : "rgba(255,255,255,0.12)",
                      boxShadow: repo.selectedForSync
                        ? "0 0 12px rgba(10,132,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
                        : "inset 0 1px 2px rgba(0,0,0,0.2)",
                      opacity: isLoading ? 0.5 : 1,
                    }}
                  >
                    <span
                      className="toggle-thumb absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full"
                      style={{
                        transform: repo.selectedForSync
                          ? "translateX(20px)"
                          : "translateX(0)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                      }}
                    />
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import RepoSelector from "@/components/RepoSelector";
import SyncButton from "@/components/SyncButton";

export default async function ReposPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [repos, userRecord] = await Promise.all([
    prisma.repository.findMany({
      where: { userId },
      orderBy: { fullName: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { githubLogin: true },
    }),
  ]);

  const githubLogin = userRecord?.githubLogin ?? null;
  const selectedCount = repos.filter((r) => r.selectedForSync).length;
  const lastSync = repos
    .filter((r) => r.lastSyncedAt)
    .map((r) => r.lastSyncedAt!)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="animate-fade-up flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold heading text-primary">Repositories</h1>
          <p className="text-secondary mt-1 text-sm">
            {repos.length === 0
              ? "Import your GitHub repos to get started"
              : `${repos.length} repos found · ${selectedCount} selected for tracking`}
            {lastSync ? ` · Last synced ${format(new Date(lastSync), "MMM d 'at' h:mm a")}` : ""}
          </p>
        </div>
        <SyncButton reposExist={repos.length > 0} hasSelectedRepos={selectedCount > 0} />
      </div>

      {/* Getting started (no repos yet) */}
      {repos.length === 0 && (
        <div className="animate-fade-up glass rounded-2xl p-6">
          <h2 className="font-semibold text-primary mb-3">Getting started</h2>
          <ol className="space-y-3 text-sm text-secondary">
            {[
              <>Click <strong className="text-primary">Import repos</strong> above — fetches your GitHub repo list.</>,
              <>Toggle on the repos you want to track. You can pick just a few.</>,
              <>Click <strong className="text-primary">Sync now</strong> — pulls commits, PRs, and issues for selected repos.</>,
              <>Head to <strong className="text-primary">Overview</strong> or <strong className="text-primary">Standup</strong> to see your data.</>,
            ].map((text, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "rgba(10,132,255,0.2)", color: "#0A84FF" }}
                >
                  {i + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Repo list */}
      {repos.length > 0 && (
        <div className="animate-fade-up">
          <RepoSelector repos={repos} userLogin={githubLogin} />
        </div>
      )}

      {/* Context banners */}
      {repos.length > 0 && selectedCount === 0 && (
        <div className="animate-fade-up glass-accent rounded-2xl p-5 text-sm">
          <p className="font-medium text-primary mb-1">No repos selected</p>
          <p className="text-secondary">
            Toggle at least one repo above, then click <strong>Sync now</strong> to pull your commits, PRs, and issues.
          </p>
        </div>
      )}

      {repos.length > 0 && selectedCount > 0 && (
        <div className="animate-fade-up glass-accent rounded-2xl p-5 text-sm">
          <p className="font-medium text-primary mb-1">
            {selectedCount} repo{selectedCount !== 1 ? "s" : ""} selected
          </p>
          <p className="text-secondary">
            Click <strong>Sync now</strong> to pull the latest data. Then visit <strong>Overview</strong> to see your burnout score and stats.
          </p>
        </div>
      )}
    </div>
  );
}

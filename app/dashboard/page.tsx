import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays, format } from "date-fns";
import BurnoutCard from "@/components/BurnoutCard";
import StatRow from "@/components/StatRow";

export default async function OverviewPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const thirtyDaysAgo = subDays(new Date(), 30);
  const today = startOfDay(new Date());

  const [burnoutHistory, recentStats, repos] = await Promise.all([
    prisma.burnoutSnapshot.findMany({
      where: { userId, date: { gte: subDays(new Date(), 30) } },
      orderBy: { date: "asc" },
    }),
    Promise.all([
      prisma.commitRecord.count({ where: { userId, authoredAt: { gte: thirtyDaysAgo } } }),
      prisma.pullRequestRecord.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.issueRecord.count({ where: { userId, createdAt: { gte: thirtyDaysAgo } } }),
    ]),
    prisma.repository.findMany({
      where: { userId },
      select: { selectedForSync: true, lastSyncedAt: true },
    }),
  ]);

  const [commitCount, prCount, issueCount] = recentStats;
  const latestBurnout = burnoutHistory.at(-1) ?? null;
  const selectedRepoCount = repos.filter((r) => r.selectedForSync).length;
  const lastSync = repos
    .filter((r) => r.lastSyncedAt)
    .map((r) => r.lastSyncedAt!)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return (
    <div className="p-6 lg:p-8 space-y-6 stagger">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold heading text-primary">
          Hey, {session!.user!.name?.split(" ")[0]}
        </h1>
        <p className="text-secondary mt-1 text-sm">
          {format(new Date(), "EEEE, MMMM d")}
          {selectedRepoCount > 0
            ? ` · ${selectedRepoCount} repo${selectedRepoCount !== 1 ? "s" : ""} tracked`
            : " · No repos selected yet"}
          {lastSync ? ` · Last synced ${format(new Date(lastSync), "MMM d 'at' h:mm a")}` : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="animate-fade-up">
        <StatRow commitCount={commitCount} prCount={prCount} issueCount={issueCount} days={30} />
      </div>

      {/* Burnout card */}
      <div className="animate-fade-up">
        <BurnoutCard snapshot={latestBurnout} history={burnoutHistory} />
      </div>

      {/* Quick actions */}
      {selectedRepoCount === 0 && (
        <div className="animate-fade-up glass rounded-2xl p-6 text-center">
          <p className="text-secondary text-sm mb-3">
            No repos selected for tracking yet.
          </p>
          <a
            href="/dashboard/repos"
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            Set up repositories →
          </a>
        </div>
      )}
    </div>
  );
}

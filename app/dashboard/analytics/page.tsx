import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { subDays, format, startOfWeek, differenceInDays } from "date-fns";
import CommitHeatmap from "@/components/CommitHeatmap";
import CodingHoursChart from "@/components/CodingHoursChart";
import PRCycleTime from "@/components/PRCycleTime";
import CodeChurn from "@/components/CodeChurn";
import CommitQuality from "@/components/CommitQuality";
import PRSummarizer from "@/components/PRSummarizer";

const VAGUE = /^(fix|fixes|fixed|update|updates|updated|wip|temp|test|minor|misc|stuff|change|changes|edit|work|done|commit|save|progress|cleanup|refactor|tweaks|tweak|patch|hotfix|quick fix|small fix|more work|working|changes\.*|updates\.*|fixes\.*)\.*[!?\s]*$/i;

export default async function AnalyticsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const oneYearAgo = subDays(new Date(), 365);
  const ninetyDaysAgo = subDays(new Date(), 90);

  const [allCommits, recentCommits, mergedPRs, userSettings, prsWithRepo] = await Promise.all([
    prisma.commitRecord.findMany({
      where: { userId, authoredAt: { gte: oneYearAgo } },
      select: { authoredAt: true, additions: true, deletions: true, message: true },
    }),
    prisma.commitRecord.findMany({
      where: { userId, authoredAt: { gte: ninetyDaysAgo } },
      select: { authoredAt: true, additions: true, deletions: true, message: true },
    }),
    prisma.pullRequestRecord.findMany({
      where: { userId, state: "merged", mergedAt: { not: null } },
      select: { createdAt: true, mergedAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.pullRequestRecord.findMany({
      where: { userId },
      include: { repo: { select: { owner: true, name: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const timezone = userSettings?.timezone ?? "UTC";
  const workStartHour = userSettings?.workStartHour ?? 9;
  const workEndHour = userSettings?.workEndHour ?? 23;

  // ── Heatmap data — bucket by user's local calendar day ──────────────────
  const heatmap: Record<string, number> = {};
  const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  for (const c of allCommits) {
    const key = dateFmt.format(new Date(c.authoredAt)); // "YYYY-MM-DD" in user tz
    heatmap[key] = (heatmap[key] ?? 0) + 1;
  }

  // ── Hours distribution — use user's configured timezone ─────────────────
  const hourCounts = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone });
  for (const c of allCommits) {
    const h = parseInt(hourFmt.format(new Date(c.authoredAt))) % 24;
    hourCounts[h].count++;
  }

  // ── PR Cycle Time ────────────────────────────────────────────────────────
  const cycleDays = mergedPRs
    .filter((p) => p.mergedAt)
    .map((p) => differenceInDays(new Date(p.mergedAt!), new Date(p.createdAt)));

  const avgCycle = cycleDays.length
    ? cycleDays.reduce((s, d) => s + d, 0) / cycleDays.length
    : 0;

  const sorted = [...cycleDays].sort((a, b) => a - b);
  const medianCycle = sorted.length
    ? sorted[Math.floor(sorted.length / 2)]
    : 0;

  // Weekly trend
  const weekTrendMap = new Map<string, number[]>();
  for (const pr of mergedPRs) {
    if (!pr.mergedAt) continue;
    const wk = format(startOfWeek(new Date(pr.createdAt), { weekStartsOn: 1 }), "MMM d");
    const days = differenceInDays(new Date(pr.mergedAt), new Date(pr.createdAt));
    const arr = weekTrendMap.get(wk) ?? [];
    arr.push(days);
    weekTrendMap.set(wk, arr);
  }
  const prTrend = Array.from(weekTrendMap.entries())
    .slice(-12)
    .map(([week, days]) => ({
      week,
      avgDays: Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10,
    }));

  // ── Code Churn ───────────────────────────────────────────────────────────
  const churnMap = new Map<string, { additions: number; deletions: number }>();
  for (const c of recentCommits) {
    const wk = format(startOfWeek(new Date(c.authoredAt), { weekStartsOn: 1 }), "MMM d");
    const existing = churnMap.get(wk) ?? { additions: 0, deletions: 0 };
    churnMap.set(wk, {
      additions: existing.additions + c.additions,
      deletions: existing.deletions + c.deletions,
    });
  }
  const churnData = Array.from(churnMap.entries())
    .slice(-12)
    .map(([week, v]) => ({ week, ...v }));

  // ── Commit Quality ───────────────────────────────────────────────────────
  const qualityCommits = recentCommits.map((c) => c.message);
  const vagueMessages = qualityCommits.filter((m) => VAGUE.test(m.trim()));
  const qualityScore = qualityCommits.length
    ? Math.round((1 - vagueMessages.length / qualityCommits.length) * 100)
    : 100;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold heading text-primary">Analytics</h1>
        <p className="text-secondary mt-1 text-sm">
          Last 12 months · Timezone: {timezone}
        </p>
      </div>

      {/* Heatmap */}
      <div className="animate-fade-up glass rounded-2xl p-6">
        <CommitHeatmap data={heatmap} />
      </div>

      {/* Hours + Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger">
        <div className="animate-fade-up glass rounded-2xl p-6">
          <CodingHoursChart
            data={hourCounts}
            workStartHour={workStartHour}
            workEndHour={workEndHour}
          />
        </div>
        <div className="animate-fade-up glass rounded-2xl p-6">
          <CommitQuality
            score={qualityScore}
            total={qualityCommits.length}
            vagueCount={vagueMessages.length}
            vagueExamples={Array.from(new Set(vagueMessages)).slice(0, 6)}
          />
        </div>
      </div>

      {/* PR Cycle Time + Code Churn */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger">
        <div className="animate-fade-up glass rounded-2xl p-6">
          <PRCycleTime
            average={Math.round(avgCycle * 10) / 10}
            median={medianCycle}
            trend={prTrend}
            total={mergedPRs.length}
          />
        </div>
        <div className="animate-fade-up glass rounded-2xl p-6">
          <CodeChurn data={churnData} />
        </div>
      </div>

      {/* PR Summarizer */}
      <div className="animate-fade-up glass rounded-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-4">
          AI PR Summarizer
        </p>
        <PRSummarizer prs={prsWithRepo} />
      </div>
    </div>
  );
}

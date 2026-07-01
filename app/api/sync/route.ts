import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncSelectedRepos } from "@/lib/github";
import { computeBurnoutScore, getWindowDates } from "@/lib/burnout";
import { generateBurnoutExplanation } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";
import type { BlackoutDate } from "@prisma/client";

function isBlackedOut(
  commitDate: Date,
  blackouts: Pick<BlackoutDate, "startDate" | "endDate">[]
): boolean {
  // Compare as UTC calendar days — same representation used by @db.Date in Postgres
  const d =
    commitDate.getUTCFullYear() * 10000 +
    (commitDate.getUTCMonth() + 1) * 100 +
    commitDate.getUTCDate();
  return blackouts.some((b) => {
    const start =
      b.startDate.getUTCFullYear() * 10000 +
      (b.startDate.getUTCMonth() + 1) * 100 +
      b.startDate.getUTCDate();
    const end =
      b.endDate.getUTCFullYear() * 10000 +
      (b.endDate.getUTCMonth() + 1) * 100 +
      b.endDate.getUTCDate();
    return d >= start && d <= end;
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  // Clamp lookbackDays to a sane range to prevent DoS via huge GitHub queries
  const rawDays = Number(body?.lookbackDays);
  const lookbackDays = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 90) : 30;
  const userId = session.user.id;

  // Rate limit: prevent re-syncing within 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 120_000);
  const recentlySynced = await prisma.repository.findFirst({
    where: { userId, selectedForSync: true, lastSyncedAt: { gte: twoMinutesAgo } },
    select: { lastSyncedAt: true },
  });
  if (recentlySynced) {
    return NextResponse.json(
      { error: "Synced too recently — wait a moment before syncing again." },
      { status: 429 }
    );
  }

  await syncSelectedRepos(userId, lookbackDays);

  const { recentStart, baselineStart } = getWindowDates();

  const [recentCommits, baselineCommits, userSettings, blackouts] = await Promise.all([
    prisma.commitRecord.findMany({ where: { userId, authoredAt: { gte: recentStart } } }),
    // Upper bound excludes the recent window so baseline isn't contaminated by current data
    prisma.commitRecord.findMany({ where: { userId, authoredAt: { gte: baselineStart, lt: recentStart } } }),
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.blackoutDate.findMany({ where: { userId }, select: { startDate: true, endDate: true } }),
  ]);

  // Exclude commits on user-configured vacation/blackout dates from the burnout calculation
  const filteredRecent = blackouts.length
    ? recentCommits.filter((c) => !isBlackedOut(new Date(c.authoredAt), blackouts))
    : recentCommits;
  const filteredBaseline = blackouts.length
    ? baselineCommits.filter((c) => !isBlackedOut(new Date(c.authoredAt), blackouts))
    : baselineCommits;

  const { baselineRatio, ...burnoutData } = computeBurnoutScore(
    filteredRecent,
    filteredBaseline,
    userSettings
      ? {
          timezone: userSettings.timezone,
          workStartHour: userSettings.workStartHour,
          workEndHour: userSettings.workEndHour,
        }
      : undefined
  );

  let explanation = "";
  try {
    explanation = await generateBurnoutExplanation({
      score: burnoutData.score,
      lateNightCount: burnoutData.lateNightCommitCount,
      weekendCount: burnoutData.weekendCommitCount,
      totalCount: burnoutData.totalCommitCount,
      baselineRatio,
    });
  } catch {
    explanation = "";
  }

  const today = startOfDay(new Date());
  await prisma.burnoutSnapshot.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, ...burnoutData, explanation },
    update: { ...burnoutData, explanation },
  });

  return NextResponse.json({ ok: true, burnout: { ...burnoutData, explanation } });
}

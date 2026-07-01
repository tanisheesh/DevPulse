import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateWeeklySummary } from "@/lib/groq";
import { startOfWeek, endOfWeek, format } from "date-fns";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const [commits, prs, issues] = await Promise.all([
    prisma.commitRecord.findMany({
      where: { userId, authoredAt: { gte: weekStart, lte: weekEnd } },
      include: { repo: { select: { fullName: true } } },
    }),
    prisma.pullRequestRecord.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      include: { repo: { select: { fullName: true } } },
    }),
    prisma.issueRecord.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      include: { repo: { select: { fullName: true } } },
    }),
  ]);

  const repoNames = Array.from(new Set(commits.map((c) => c.repo.fullName)));

  let content: string;
  try {
    content = await generateWeeklySummary({
      weekStart: format(weekStart, "MMM d"),
      weekEnd: format(weekEnd, "MMM d, yyyy"),
      commitCount: commits.length,
      prCount: prs.length,
      issueCount: issues.length,
      topCommitMessages: commits.map((c) => c.message).slice(0, 15),
      topPrTitles: prs.map((p) => p.title).slice(0, 8),
      repoNames,
    });
  } catch {
    content = "Could not generate summary — AI service unavailable, try again in a moment.";
  }

  const summary = await prisma.weeklySummary.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { userId, weekStart, content },
    update: { content, generatedAt: new Date() },
  });

  return NextResponse.json(summary);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const summary = await prisma.weeklySummary.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
  });

  return NextResponse.json(summary ?? null);
}

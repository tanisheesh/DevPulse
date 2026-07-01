import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateMonthlyReview } from "@/lib/groq";
import { startOfMonth, endOfMonth, format } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const monthStart = startOfMonth(new Date());

  const review = await prisma.monthlyReview.findUnique({
    where: { userId_monthStart: { userId, monthStart } },
  });
  return NextResponse.json(review);
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const [commits, prs, issues, burnoutHistory, repos] = await Promise.all([
    prisma.commitRecord.findMany({
      where: { userId, authoredAt: { gte: monthStart, lte: monthEnd } },
      select: { message: true },
    }),
    prisma.pullRequestRecord.findMany({
      where: { userId, createdAt: { gte: monthStart, lte: monthEnd } },
      select: { title: true },
    }),
    prisma.issueRecord.count({
      where: { userId, createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.burnoutSnapshot.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      select: { score: true },
    }),
    prisma.repository.findMany({
      where: { userId, selectedForSync: true },
      select: { fullName: true },
    }),
  ]);

  const avgBurnout =
    burnoutHistory.length > 0
      ? Math.round(burnoutHistory.reduce((s, b) => s + b.score, 0) / burnoutHistory.length)
      : null;

  let content: string;
  try {
    content = await generateMonthlyReview({
      monthLabel: format(monthStart, "MMMM yyyy"),
      commitCount: commits.length,
      prCount: prs.length,
      issueCount: issues,
      topCommitMessages: commits.map((c) => c.message).slice(0, 15),
      topPrTitles: prs.map((p) => p.title).slice(0, 8),
      repoNames: repos.map((r) => r.fullName),
      avgBurnoutScore: avgBurnout,
    });
  } catch {
    content = "Could not generate review — AI service unavailable, try again in a moment.";
  }

  const review = await prisma.monthlyReview.upsert({
    where: { userId_monthStart: { userId, monthStart } },
    create: { userId, monthStart, content },
    update: { content, generatedAt: new Date() },
  });

  return NextResponse.json(review);
}

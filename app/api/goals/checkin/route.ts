import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateGoalCheckIn } from "@/lib/groq";
import { startOfWeek, endOfWeek, format } from "date-fns";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const [goals, commits, prs, issues] = await Promise.all([
    prisma.goal.findMany({ where: { userId, weekStart } }),
    prisma.commitRecord.count({ where: { userId, authoredAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.pullRequestRecord.count({ where: { userId, createdAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.issueRecord.count({ where: { userId, createdAt: { gte: weekStart, lte: weekEnd } } }),
  ]);

  const actuals: Record<string, number> = { commits, prs, issues };

  let content: string;
  try {
    content = await generateGoalCheckIn({
      weekLabel: `${format(weekStart, "MMM d")}–${format(weekEnd, "MMM d")}`,
      goals: goals.map((g) => ({
        type: g.type,
        target: g.target,
        actual: actuals[g.type] ?? 0,
      })),
    });
  } catch {
    content = "Could not generate check-in — AI service unavailable, try again in a moment.";
  }

  return NextResponse.json({ content });
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, format } from "date-fns";
import GoalTracker from "@/components/GoalTracker";

export default async function GoalsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const [goals, commits, prs, issues] = await Promise.all([
    prisma.goal.findMany({ where: { userId, weekStart }, orderBy: { type: "asc" } }),
    prisma.commitRecord.count({ where: { userId, authoredAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.pullRequestRecord.count({ where: { userId, createdAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.issueRecord.count({ where: { userId, createdAt: { gte: weekStart, lte: weekEnd } } }),
  ]);

  const actuals = { commits, prs, issues };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold heading text-primary">Goals</h1>
        <p className="text-secondary mt-1 text-sm">
          {format(weekStart, "MMM d")}–{format(weekEnd, "MMM d, yyyy")} · Weekly targets
        </p>
      </div>

      {/* This week's actuals */}
      <div className="animate-fade-up grid grid-cols-3 gap-3">
        {[
          { label: "Commits",      value: commits, color: "#0A84FF" },
          { label: "Pull Requests", value: prs,     color: "#BF5AF2" },
          { label: "Issues",        value: issues,  color: "#30D158" },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-subtle rounded-xl p-4 text-center">
            <p className="text-2xl font-bold heading" style={{ color }}>{value}</p>
            <p className="text-xs text-secondary mt-1">{label} this week</p>
          </div>
        ))}
      </div>

      <div className="animate-fade-up">
        <GoalTracker goals={goals} actuals={actuals} checkIn={null} />
      </div>
    </div>
  );
}

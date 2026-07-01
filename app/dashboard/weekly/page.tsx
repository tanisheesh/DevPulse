import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, startOfMonth, format } from "date-fns";
import WeeklySummaryPanel from "@/components/WeeklySummaryPanel";
import MonthlyReviewPanel from "@/components/MonthlyReviewPanel";

export default async function WeeklyPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());

  const [summary, monthlyReview] = await Promise.all([
    prisma.weeklySummary.findUnique({ where: { userId_weekStart: { userId, weekStart } } }),
    prisma.monthlyReview.findUnique({ where: { userId_monthStart: { userId, monthStart } } }),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold heading text-primary">Weekly & Monthly</h1>
        <p className="text-secondary mt-1 text-sm">
          {format(weekStart, "MMM d")}–{format(weekEnd, "MMM d, yyyy")} · AI-generated summaries
        </p>
      </div>
      <div className="animate-fade-up">
        <WeeklySummaryPanel initialSummary={summary} />
      </div>
      <div className="animate-fade-up">
        <MonthlyReviewPanel initialReview={monthlyReview} />
      </div>
    </div>
  );
}

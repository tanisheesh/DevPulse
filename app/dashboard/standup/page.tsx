import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { dayBoundariesInTz } from "@/lib/date-utils";
import StandupPanel from "@/components/StandupPanel";

export default async function StandupPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const userSettings = await prisma.userSettings.findUnique({ where: { userId } });
  const timezone = userSettings?.timezone ?? "UTC";
  const { today } = dayBoundariesInTz(timezone);

  const standup = await prisma.standupReport.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold heading text-primary">Standup</h1>
        <p className="text-secondary mt-1 text-sm">
          {format(new Date(), "EEEE, MMMM d")} · AI-generated from yesterday&apos;s activity
        </p>
      </div>
      <div className="animate-fade-up">
        <StandupPanel initialReport={standup} />
      </div>
    </div>
  );
}

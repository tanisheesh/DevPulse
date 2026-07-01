import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [settings, blackoutDates] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.blackoutDate.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold heading text-primary">Settings</h1>
        <p className="text-secondary mt-1 text-sm">
          Personalize your burnout score and time tracking
        </p>
      </div>

      <div className="animate-fade-up">
        <SettingsForm
          timezone={settings?.timezone ?? "UTC"}
          workStartHour={settings?.workStartHour ?? 9}
          workEndHour={settings?.workEndHour ?? 23}
          blackoutDates={blackoutDates.map((d) => ({
            ...d,
            startDate: d.startDate.toISOString(),
            endDate: d.endDate.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}

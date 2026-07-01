import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_TIMEZONES = new Set(Intl.supportedValuesOf("timeZone"));

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  return NextResponse.json(
    settings ?? { timezone: "UTC", workStartHour: 9, workEndHour: 23 }
  );
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const { timezone, workStartHour, workEndHour } = body as {
    timezone?: string;
    workStartHour?: number;
    workEndHour?: number;
  };

  const data: Record<string, unknown> = {};

  if (timezone !== undefined) {
    if (!VALID_TIMEZONES.has(timezone)) {
      return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
    }
    data.timezone = timezone;
  }
  if (workStartHour !== undefined) {
    const h = Math.round(Number(workStartHour));
    if (!Number.isFinite(h) || h < 0 || h > 23) {
      return NextResponse.json({ error: "workStartHour must be 0–23" }, { status: 400 });
    }
    data.workStartHour = h;
  }
  if (workEndHour !== undefined) {
    const h = Math.round(Number(workEndHour));
    if (!Number.isFinite(h) || h < 0 || h > 23) {
      return NextResponse.json({ error: "workEndHour must be 0–23" }, { status: 400 });
    }
    data.workEndHour = h;
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, timezone: "UTC", workStartHour: 9, workEndHour: 23, ...data },
    update: data,
  });

  return NextResponse.json(settings);
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  // Accept "YYYY-MM-DD" only to avoid timezone ambiguity
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dates = await prisma.blackoutDate.findMany({
    where: { userId: session.user.id },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(dates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const { startDate, endDate, label } = body;

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start) return NextResponse.json({ error: "startDate must be YYYY-MM-DD" }, { status: 400 });
  if (!end) return NextResponse.json({ error: "endDate must be YYYY-MM-DD" }, { status: 400 });
  if (end < start) return NextResponse.json({ error: "endDate must be ≥ startDate" }, { status: 400 });

  const record = await prisma.blackoutDate.create({
    data: {
      userId,
      startDate: start,
      endDate: end,
      label: typeof label === "string" ? label.slice(0, 100) : null,
    },
  });
  return NextResponse.json(record);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id } = body as { id: string };
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await prisma.blackoutDate.deleteMany({
    where: { id, userId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}

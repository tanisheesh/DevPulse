import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek } from "date-fns";

const VALID_TYPES = new Set(["commits", "prs", "issues"]);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const goals = await prisma.goal.findMany({
    where: { userId, weekStart },
    orderBy: { type: "asc" },
  });
  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const { type, target } = body as { type: string; target: number };

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid goal type" }, { status: 400 });
  }
  const rawTarget = Number(target);
  if (!Number.isFinite(rawTarget)) {
    return NextResponse.json({ error: "target must be a number between 1 and 9999" }, { status: 400 });
  }
  const clampedTarget = Math.max(1, Math.min(Math.round(rawTarget), 9999));

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const goal = await prisma.goal.upsert({
    where: { userId_weekStart_type: { userId, weekStart, type } },
    create: { userId, weekStart, type, target: clampedTarget },
    update: { target: clampedTarget },
  });
  return NextResponse.json(goal);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const { id } = body as { id: string };
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await prisma.goal.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateStandup } from "@/lib/groq";
import { dayBoundariesInTz } from "@/lib/date-utils";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const userSettings = await prisma.userSettings.findUnique({ where: { userId } });
  const timezone = userSettings?.timezone ?? "UTC";
  const { today, yesterday } = dayBoundariesInTz(timezone);

  const [commits, prs, issues] = await Promise.all([
    prisma.commitRecord.findMany({
      where: { userId, authoredAt: { gte: yesterday, lt: today } },
      include: { repo: { select: { fullName: true } } },
    }),
    prisma.pullRequestRecord.findMany({
      where: { userId, createdAt: { gte: yesterday, lt: today } },
      include: { repo: { select: { fullName: true } } },
    }),
    prisma.issueRecord.findMany({
      where: { userId, createdAt: { gte: yesterday, lt: today } },
      include: { repo: { select: { fullName: true } } },
    }),
  ]);

  const repoNames = Array.from(new Set([
    ...commits.map((c) => c.repo.fullName),
    ...prs.map((p) => p.repo.fullName),
    ...issues.map((i) => i.repo.fullName),
  ]));

  let content: string;
  try {
    content = await generateStandup({
      yesterday: {
        commits: commits.map((c) => `[${c.repo.fullName}] ${c.message}`),
        prs: prs.map((p) => `[${p.repo.fullName}] ${p.title} (${p.state})`),
        issues: issues.map((i) => `[${i.repo.fullName}] ${i.title} (${i.state})`),
      },
      repos: repoNames,
    });
  } catch {
    content = "Could not generate standup — AI service unavailable, try again in a moment.";
  }

  const report = await prisma.standupReport.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, content },
    update: { content, generatedAt: new Date() },
  });

  return NextResponse.json(report);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const userSettings = await prisma.userSettings.findUnique({ where: { userId } });
  const timezone = userSettings?.timezone ?? "UTC";
  const { today } = dayBoundariesInTz(timezone);

  const report = await prisma.standupReport.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  return NextResponse.json(report ?? null);
}

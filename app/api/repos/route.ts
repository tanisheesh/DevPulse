import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncUserRepos } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repos = await prisma.repository.findMany({
    where: { userId: session.user.id },
    orderBy: { fullName: "asc" },
  });

  // First load: fetch repo list from GitHub if none stored yet
  if (repos.length === 0) {
    await syncUserRepos(session.user.id);
    const fresh = await prisma.repository.findMany({
      where: { userId: session.user.id },
      orderBy: { fullName: "asc" },
    });
    return NextResponse.json(fresh);
  }

  return NextResponse.json(repos);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { repoId, selectedForSync } = body as { repoId: string; selectedForSync: boolean };

  const repo = await prisma.repository.findFirst({
    where: { id: repoId, userId: session.user.id },
  });
  if (!repo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.repository.update({
    where: { id: repoId },
    data: { selectedForSync },
  });

  return NextResponse.json(updated);
}

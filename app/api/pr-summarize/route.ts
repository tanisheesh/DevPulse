import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOctokitForUser } from "@/lib/github";
import { generatePRSummary } from "@/lib/groq";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { owner, repo, number } = body as { owner: string; repo: string; number: number };

  if (
    typeof owner !== "string" || !/^[\w.-]{1,100}$/.test(owner) ||
    typeof repo !== "string" || !/^[\w.-]{1,100}$/.test(repo) ||
    typeof number !== "number" || !Number.isInteger(number) || number < 1 || number > 999999
  ) {
    return NextResponse.json({ error: "Invalid owner, repo, or PR number" }, { status: 400 });
  }

  // Ensure the repo belongs to this user
  const ownedRepo = await prisma.repository.findFirst({
    where: { userId: session.user.id, owner, name: repo },
    select: { id: true },
  });
  if (!ownedRepo) {
    return NextResponse.json({ error: "Repository not found" }, { status: 404 });
  }

  const { octokit } = await getOctokitForUser(session.user.id);

  const [prRes, filesRes] = await Promise.all([
    octokit.rest.pulls.get({ owner, repo, pull_number: number }),
    octokit.rest.pulls.listFiles({ owner, repo, pull_number: number, per_page: 30 }),
  ]);

  const pr = prRes.data;
  const changedFiles = filesRes.data.map((f) => f.filename);

  let summary: string;
  try {
    summary = await generatePRSummary({
      title: pr.title,
      repoFullName: `${owner}/${repo}`,
      body: pr.body,
      changedFiles,
      additions: pr.additions,
      deletions: pr.deletions,
    });
  } catch {
    summary = "Could not generate summary — AI service unavailable, try again in a moment.";
  }

  return NextResponse.json({ summary });
}

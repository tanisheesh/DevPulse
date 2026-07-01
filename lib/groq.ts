import Groq from "groq-sdk";

const MODEL = "llama-3.3-70b-versatile";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function generateStandup(data: {
  yesterday: { commits: string[]; prs: string[]; issues: string[] };
  repos: string[];
}): Promise<string> {
  const prompt = `You are a developer productivity assistant. Based ONLY on the data provided below, write a concise daily standup report in plain text with three sections: Yesterday, Today, and Blockers.

Rules:
- Ground every bullet point in the provided data — do not invent or assume anything.
- "Today" should reflect obvious continuations (e.g. open PRs awaiting review, open issues).
- "Blockers" should say "None identified from current data" if there are none apparent.
- Use bullet points, keep it under 150 words total.

Data:
Repos active yesterday: ${data.repos.join(", ") || "none"}
Commits: ${data.yesterday.commits.slice(0, 20).join(" | ") || "none"}
Pull Requests: ${data.yesterday.prs.join(" | ") || "none"}
Issues touched: ${data.yesterday.issues.join(" | ") || "none"}`;

  const chat = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 300,
  });

  return chat.choices[0]?.message?.content ?? "Could not generate standup.";
}

export async function generateWeeklySummary(data: {
  weekStart: string;
  weekEnd: string;
  commitCount: number;
  prCount: number;
  issueCount: number;
  topCommitMessages: string[];
  topPrTitles: string[];
  repoNames: string[];
}): Promise<string> {
  const prompt = `You are a developer productivity assistant. Write a 3–5 sentence weekly summary of this developer's work, grounded ONLY in the data below. Do not fabricate.

Week: ${data.weekStart} to ${data.weekEnd}
Repos worked on: ${data.repoNames.join(", ") || "none"}
Commits: ${data.commitCount} total. Sample messages: ${data.topCommitMessages.slice(0, 10).join(" | ") || "none"}
Pull Requests: ${data.prCount} total. Titles: ${data.topPrTitles.slice(0, 5).join(" | ") || "none"}
Issues touched: ${data.issueCount}`;

  const chat = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 300,
  });

  return chat.choices[0]?.message?.content ?? "Could not generate summary.";
}

export async function generateBurnoutExplanation(data: {
  score: number;
  lateNightCount: number;
  weekendCount: number;
  totalCount: number;
  baselineRatio: number;
}): Promise<string> {
  if (data.totalCount === 0) return "Not enough commit data to assess burnout risk.";

  const prompt = `In exactly ONE sentence, explain this developer's burnout risk score using the numbers below. Mention at least one specific number. Do not add caveats or recommendations.

Score: ${data.score}/100
Late-night/after-hours commits: ${data.lateNightCount} of ${data.totalCount}
Weekend commits: ${data.weekendCount} of ${data.totalCount}
Baseline off-hours ratio (days 15–60 ago): ${(data.baselineRatio * 100).toFixed(0)}%`;

  const chat = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 80,
  });

  return chat.choices[0]?.message?.content?.trim() ?? "";
}

export async function generateMonthlyReview(data: {
  monthLabel: string;
  commitCount: number;
  prCount: number;
  issueCount: number;
  topCommitMessages: string[];
  topPrTitles: string[];
  repoNames: string[];
  avgBurnoutScore: number | null;
}): Promise<string> {
  const prompt = `You are a developer productivity assistant. Write a professional monthly performance review (4–6 sentences) that a developer could use in a performance review or self-evaluation. Ground EVERY claim in the data below. Do not invent metrics.

Month: ${data.monthLabel}
Repos: ${data.repoNames.join(", ") || "none"}
Commits: ${data.commitCount}. Sample: ${data.topCommitMessages.slice(0, 12).join(" | ") || "none"}
Pull Requests opened/merged: ${data.prCount}. Titles: ${data.topPrTitles.slice(0, 6).join(" | ") || "none"}
Issues: ${data.issueCount}
Avg burnout score: ${data.avgBurnoutScore !== null ? `${data.avgBurnoutScore}/100` : "not available"}

Write in third person ("The developer..."). Highlight contributions, consistency, and any notable patterns. Be professional and specific.`;

  const chat = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 400,
  });

  return chat.choices[0]?.message?.content?.trim() ?? "Could not generate review.";
}

export async function generatePRSummary(data: {
  title: string;
  repoFullName: string;
  body: string | null;
  changedFiles: string[];
  additions: number;
  deletions: number;
}): Promise<string> {
  const prompt = `Summarize this pull request in 2–3 sentences for a developer audience. Be specific about what changed. Do not add padding or vague phrases like "this PR improves the codebase."

Repo: ${data.repoFullName}
Title: ${data.title}
Description: ${data.body?.slice(0, 800) || "No description provided"}
Changed files (sample): ${data.changedFiles.slice(0, 10).join(", ") || "unknown"}
Lines changed: +${data.additions} / -${data.deletions}`;

  const chat = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 200,
  });

  return chat.choices[0]?.message?.content?.trim() ?? "Could not generate summary.";
}

export async function generateGoalCheckIn(data: {
  weekLabel: string;
  goals: { type: string; target: number; actual: number }[];
}): Promise<string> {
  const lines = data.goals.map(
    (g) => `${g.type}: target ${g.target}, actual ${g.actual} (${g.actual >= g.target ? "MET" : "MISSED"})`
  );

  const prompt = `Write a brief, encouraging 2–3 sentence weekly goal check-in for a developer. Be honest about what was missed but constructive. Ground it in the numbers.

Week: ${data.weekLabel}
Goals:
${lines.join("\n")}`;

  const chat = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 150,
  });

  return chat.choices[0]?.message?.content?.trim() ?? "";
}

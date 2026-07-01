# DevPulse — Architecture

## 1. Stack
- **Framework**: Next.js 16 (App Router, TypeScript)
- **Auth**: Auth.js (NextAuth v5) with GitHub OAuth provider
- **ORM / DB**: Prisma + Neon Postgres (serverless, pooled connection for Vercel functions)
- **AI**: Groq API — OpenAI SDK-compatible chat completions client, Llama 3.x model — used only for natural-language summarization, never for the burnout score calculation itself
- **Styling**: Tailwind CSS
- **Charts**: Recharts (burnout trend line)
- **GitHub data**: Octokit (REST + GraphQL client), using the OAuth access token from the signed-in session
- **Hosting**: Vercel

## 2. Data flow

```
[Browser] --GitHub OAuth--> [Auth.js] --access token in session-->
   [User clicks "Sync"] --> POST /api/sync
        --> Octokit pulls commits/PRs/issues for selected repos (last N days)
        --> normalize + upsert into Postgres (CommitRecord/PullRequestRecord/IssueRecord)
        --> burnout module recomputes BurnoutSnapshot from stored CommitRecord timestamps (pure function, no AI)
   [Dashboard renders] <-- reads Repository/CommitRecord/BurnoutSnapshot/StandupReport/WeeklySummary from DB

   [User clicks "Generate standup"] --> POST /api/standup
        --> query yesterday's CommitRecord/PullRequestRecord/IssueRecord for user
        --> assemble structured JSON (counts, titles, repo names — not raw diffs)
        --> Groq chat completion with grounded prompt --> store StandupReport row --> render

   [User clicks "Generate weekly summary"] --> POST /api/summary/weekly
        --> same pattern, 7-day window --> WeeklySummary row
```

## 3. Database schema (Prisma models, conceptual)

- `User` — id, githubId, login, avatarUrl, accessToken (encrypted at rest), createdAt
- `Account` / `Session` / `VerificationToken` — standard Auth.js Prisma adapter tables
- `Repository` — id, userId, owner, name, fullName, private (bool), selectedForSync (bool)
- `CommitRecord` — id, userId, repoId, sha, message, authoredAt, additions, deletions
- `PullRequestRecord` — id, userId, repoId, number, title, state, createdAt, mergedAt
- `IssueRecord` — id, userId, repoId, number, title, state, createdAt, closedAt
- `BurnoutSnapshot` — id, userId, date, score (0–100), lateNightCommitCount, weekendCommitCount, totalCommitCount, explanation (AI-written, one sentence)
- `StandupReport` — id, userId, date, content, generatedAt
- `WeeklySummary` — id, userId, weekStart, content, generatedAt

Indexes: `CommitRecord(userId, authoredAt)`, `PullRequestRecord(userId, createdAt)` — these are the hot query paths for both the dashboard and the burnout calculation.

## 4. Burnout score algorithm (deterministic — no AI involved in the number)

Documented here so the score is auditable, not a black box:

1. Look at the user's `CommitRecord`s over a rolling 14-day window.
2. Classify each commit using the user's configured IANA timezone (default UTC):
   - **After-hours**: `authoredAt` converted to the user's timezone falls before the configured work-start hour (default 9 AM) or at/after the work-end hour (default 11 PM). Both thresholds are user-configurable in Settings.
   - **Weekend**: `authoredAt` day in the user's timezone is Saturday or Sunday.
3. Compute `riskCommits` = count of commits that are after-hours **or** weekend (union — a commit that satisfies both counts once).
4. Compute `riskRatio = riskCommits / totalCommitCount` (guard against divide-by-zero — if `totalCommitCount == 0`, score is `null`/"not enough data", not 0).
5. Normalize against the user's own trailing 60-day baseline `riskRatio` (so a dev who always works weekends isn't perpetually flagged — the score reflects a *change* from their own normal pattern, not an absolute judgment).
6. Map the normalized delta to a 0–100 score via a clamped linear scale.
7. Store `lateNightCommitCount`, `weekendCommitCount`, `totalCommitCount` alongside the score so the UI can always show the raw numbers behind it.
8. **Only after the number is computed**, send `{score, lateNightCommitCount, weekendCommitCount, totalCommitCount, delta-from-baseline}` to Groq with a prompt that asks for exactly one grounded sentence explaining the score — the model is explicitly instructed not to invent causes not present in the data.

## 5. AI prompt design

Two templates, both **input is structured JSON, never raw diffs/code** (keeps token usage low, keeps output deterministic and factual, avoids leaking unrelated code content to a third-party API):

- **Standup prompt** — input: yesterday's commit messages (titles only), PR titles/states, issue titles/states, repo names. Instruction: produce Yesterday/Today/Blockers in plain text, grounded only in the provided items, no fabrication, "Today" section phrased as a reasonable continuation (e.g. open PRs awaiting review) rather than invented plans.
- **Weekly summary prompt** — input: 7-day aggregate counts + top commit/PR titles per repo. Instruction: 3–5 sentence narrative summary, grounded only in provided data.
- **Burnout explanation prompt** — input: the score + the three raw counts + baseline ratio (days 15–60 ago). Instruction: exactly one sentence, must reference at least one concrete number from the input.

## 6. API routes (Next.js route handlers)

- `/api/auth/[...nextauth]` — Auth.js GitHub provider
- `/api/repos` — `GET` list synced/available repos, `PATCH` toggle `selectedForSync`
- `/api/sync` — `POST` triggers GitHub pull + burnout recompute for the signed-in user
- `/api/standup` — `POST` generates/regenerates today's standup report
- `/api/summary/weekly` — `POST` generates/regenerates the current week's summary

## 7. Security notes

- GitHub access tokens are encrypted before being persisted (not stored in plaintext columns).
- Groq API key and Postgres connection string live only in `.env.local` (gitignored) locally and in Vercel's encrypted project env vars in production — never committed, never logged.
- `.env.example` is committed with empty placeholder keys so setup steps are clear without exposing real secrets.
- Default OAuth scope requested is `read:user public_repo` only; access to private repos is an explicit, separate opt-in toggle in the UI, not part of the default login flow — minimizes what a first-time visitor/recruiter has to grant just to try the demo.

## 8. Deployment plan

1. Vercel project linked to the GitHub repo (auto-deploy on push to `main`).
2. Neon Postgres database provisioned; pooled connection string (`?pgbouncer=true` style) used for serverless function compatibility.
3. Env vars set in the Vercel project dashboard: `DATABASE_URL`, `GITHUB_ID`, `GITHUB_SECRET`, `GROQ_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
4. `prisma migrate deploy` runs as part of the Vercel build step (added to `package.json` build script) so schema stays in sync with each deploy.

## 9. Explicit scope cut (carried over from PRD)

Jira/Linear integration is **not** built in v1 despite being mentioned in the original product pitch. v1 is GitHub-only. This is recorded here so it's not rediscovered as a surprise mid-build.

# DevPulse — Architecture

<!--
Companion to PRD.md.
PRD says WHAT the system does. This says HOW.
Audience: an engineer who needs to understand the system well
enough to build it, debug it, or extend it.
-->

---

## 1. Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript 6, Turbopack) |
| Auth | Auth.js v5 (NextAuth beta) · GitHub OAuth provider |
| Database | Neon Postgres (serverless, pooled) · Prisma 7 |
| ORM | Prisma Client (with `@prisma/adapter-pg` for edge-compatible pooling) |
| AI | Groq API · Llama 3.3 70B Versatile (via `groq-sdk`) |
| GitHub data | Octokit REST + GraphQL (cursor-paginated, capped at 2000 commits / 500 PRs per sync) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Hosting | Vercel (auto-deploy on push to `main`) |

---

## 2. Components

```
app/
  page.tsx              Landing page — GitHub OAuth sign-in entry point
  dashboard/            Protected area: overview, analytics, standup, weekly, goals, repos, settings
  api/                  All Next.js route handlers (server-side only)

components/             React components (all RSC or client)
  BurnoutCard.tsx       Burnout score display + trend line
  CodingHoursChart.tsx  Hourly commit distribution
  CommitHeatmap.tsx     Full-year contribution heatmap
  PRCycleTime.tsx       Avg/median days open → merge + weekly trend
  CodeChurn.tsx         Lines added vs deleted per week
  CommitQuality.tsx     Vague-message detection score
  GoalTracker.tsx       Weekly goal progress + AI check-in
  StandupPanel.tsx      Today's standup report with regenerate button
  WeeklySummaryPanel.tsx Weekly AI narrative
  MonthlyReviewPanel.tsx Monthly AI performance paragraph
  PRSummarizer.tsx      Per-PR plain-English summary
  RepoSelector.tsx      Toggle repos for sync
  SettingsForm.tsx       Timezone, work hours, vacation dates

lib/
  burnout.ts            Deterministic burnout score algorithm (no AI)
  groq.ts               All Groq/LLM prompt functions
  github.ts             Octokit sync functions (commits, PRs, issues)
  prisma.ts             Prisma client singleton
  crypto.ts             AES-256-GCM token encryption/decryption
  date-utils.ts         Timezone-aware day boundary helpers

prisma/
  schema.prisma         Full Prisma schema for all models
```

### Landing page + Auth

`app/page.tsx` is a server component that checks for an active session and redirects authenticated users to `/dashboard`. Unauthenticated visitors see the marketing page with a GitHub sign-in form (server action calling `signIn("github")`). Auth is handled by `auth.ts` which configures Auth.js with the GitHub provider, the PrismaAdapter, and a `signIn` event that immediately encrypts the OAuth token and wipes the plaintext copy from the `Account` table.

### Sync route (`/api/sync`)

The core data ingestion endpoint. On POST, it:
1. Rate-limits to one sync per 2 minutes (DB check on `lastSyncedAt`).
2. Calls `syncSelectedRepos()` which fetches commits, PRs, and issues via GraphQL with cursor pagination, filtered to the authenticated user's own login.
3. Upserts all records into `CommitRecord`, `PullRequestRecord`, `IssueRecord`.
4. Runs `computeBurnoutScore()` (deterministic — no AI).
5. Calls Groq for a one-sentence burnout explanation (fire-and-forget; failure degrades gracefully).
6. Upserts a `BurnoutSnapshot` for today.

### Burnout module (`lib/burnout.ts`)

Pure function — no side effects, no AI. Classifies each commit as after-hours or weekend using the user's configured IANA timezone. Computes a `riskRatio` for the 14-day window and normalizes it against the 60-day baseline. Blackout dates (vacation) are filtered before the commits reach this function. Result is a 0–100 integer score.

### AI module (`lib/groq.ts`)

Six prompt functions: `generateStandup`, `generateWeeklySummary`, `generateMonthlyReview`, `generatePRSummary`, `generateGoalCheckIn`, `generateBurnoutExplanation`. All send structured JSON (commit titles, PR titles, counts) — never raw diffs or code. Each has a tight `max_tokens` cap and low `temperature` (0.2–0.5). Failures throw; callers catch and degrade gracefully.

---

## 3. Data Flow

```
[Browser] --GitHub OAuth--> [Auth.js] --signIn event-->
    encrypt access token → store in User.accessToken
    wipe Account.access_token (plaintext removed)
    redirect to /dashboard

[User clicks Sync] --> POST /api/sync
    rate-limit check (2 min cooldown)
    --> Octokit GraphQL pulls commits/PRs/issues for selected repos
    --> upsert CommitRecord / PullRequestRecord / IssueRecord
    --> computeBurnoutScore() (pure function, uses UserSettings + BlackoutDates)
    --> generateBurnoutExplanation() via Groq (one sentence, grounded in numbers)
    --> upsert BurnoutSnapshot for today

[User clicks "Generate standup"] --> POST /api/standup
    --> query yesterday's records (timezone-aware day boundaries)
    --> assemble structured JSON
    --> generateStandup() via Groq --> upsert StandupReport

[Dashboard renders] <-- reads from DB (no live API calls on page load)
```

1. User signs in with GitHub — token encrypted and stored, plaintext removed.
2. User selects repos on `/dashboard/repos` via PATCH `/api/repos`.
3. User clicks Sync — GitHub data pulled, burnout computed, snapshot saved.
4. User clicks "Generate standup" — yesterday's data assembled, Groq writes the report.
5. Dashboard reads all data from Postgres — no GitHub API calls on page render.

---

## 4. Database Schema

- `User` — id, name, email, githubLogin, accessToken (AES-256-GCM encrypted), createdAt
- `Account` / `Session` / `VerificationToken` — standard Auth.js Prisma adapter tables; `Account.access_token` is nulled out immediately after OAuth to remove the plaintext token
- `Repository` — userId, owner, name, fullName, isPrivate, selectedForSync (bool), lastSyncedAt
- `CommitRecord` — userId, repoId, sha, message (first line, max 280 chars), authoredAt, additions, deletions, url
- `PullRequestRecord` — userId, repoId, number, title, state (open/closed/merged), createdAt, mergedAt, url
- `IssueRecord` — userId, repoId, number, title, state, createdAt, closedAt, url
- `BurnoutSnapshot` — userId, date (Date only), score (0–100), lateNightCommitCount, weekendCommitCount, totalCommitCount, explanation (one AI sentence)
- `StandupReport` — userId, date (Date only), content (Text), generatedAt
- `WeeklySummary` — userId, weekStart (Date), content (Text), generatedAt
- `MonthlyReview` — userId, monthStart (Date), content (Text), generatedAt
- `UserSettings` — userId (1:1), timezone (IANA string), workStartHour (default 9), workEndHour (default 23)
- `BlackoutDate` — userId, startDate, endDate, label — vacation ranges excluded from burnout
- `Goal` — userId, weekStart, type (commits/prs/issues), target (int)

**Indexes:**
- `CommitRecord(userId, authoredAt)` — primary hot path for burnout calculation and standup query
- `PullRequestRecord(userId, createdAt)` — PR cycle time and standup queries
- `IssueRecord(userId, createdAt)` — standup and summary queries
- `BurnoutSnapshot(userId, date)` — unique constraint + index for daily upsert and trend queries
- `Repository(userId)` — repo list and sync queries

---

## 5. AI / LLM Design

### Input

All prompts receive structured JSON or plain key-value text assembled from DB records — never raw diffs, never file contents. This keeps token usage low, prevents leaking repository code to a third-party API, and makes outputs deterministic and factual.

### System prompt strategy

Each function sends a single `user` role message (no explicit system turn). Every prompt:
- States the output format explicitly (bullet points / N sentences / one sentence).
- Contains a "Ground EVERY claim in the data below — do not fabricate" instruction.
- Has an explicit word/sentence count cap in the instruction.
- For burnout explanation: "mention at least one specific number."
- For standup "Today" section: phrased as a continuation of open items, not invented plans.

### Response schema

Responses are plain text, not JSON. No structured output parsing is required — the prompts prescribe the exact format (three labeled sections for standup, N sentences for summaries).

### Validation

No schema validation. If `choices[0]?.message?.content` is nullish, the caller receives a fallback string (e.g. `"Could not generate standup."`). The DB upsert still succeeds with the fallback — the feature degrades to a placeholder, not a 500.

### Failure handling

Each Groq call is wrapped in a try/catch at the route level. A Groq failure on standup/summary returns the fallback string and still writes a report row. A Groq failure on burnout explanation stores an empty `explanation` string — the numeric score is unaffected because it is computed before the LLM call.

---

## 6. API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/repos` | List all repos for the signed-in user |
| `PATCH` | `/api/repos` | Toggle `selectedForSync` on a repo |
| `POST` | `/api/sync` | Pull GitHub data + recompute burnout score |
| `POST` | `/api/standup` | Generate / regenerate today's standup report |
| `GET` | `/api/standup` | Fetch today's standup report |
| `POST` | `/api/summary/weekly` | Generate / regenerate current week's summary |
| `POST` | `/api/monthly-review` | Generate / regenerate current month's review |
| `POST` | `/api/pr-summarize` | Summarize a specific PR by number + repo |
| `GET` | `/api/goals` | List current week's goals |
| `POST` | `/api/goals` | Create / update a weekly goal |
| `POST` | `/api/goals/checkin` | AI check-in on goal progress |
| `GET` | `/api/settings` | Fetch user settings |
| `PUT` | `/api/settings` | Update timezone, work hours |
| `POST` | `/api/blackout` | Add / remove vacation date ranges |

All routes check `auth()` and return `401` before touching the DB or any external service if the session is missing.

---

## 7. Security

- **GitHub access tokens:** Encrypted with AES-256-GCM (random 12-byte IV per token) immediately after OAuth via the `signIn` event. The PrismaAdapter's plaintext copy in `Account.access_token` is overwritten to `null` in the same event — no plaintext token persists in the database.
- **Encryption key:** `TOKEN_ENCRYPTION_KEY` is a 32-byte base64 secret in env vars only — gitignored locally, Vercel encrypted env in production. Never logged.
- **API keys (Groq, DB):** Server-side env vars only. No `NEXT_PUBLIC_` prefix. Never reach the browser.
- **OAuth scope:** Requests only `read:user user:email public_repo`. Private repo access is an explicit opt-in in the UI — not part of the default login flow.
- **Rate limiting:** Sync route enforces a 2-minute cooldown per user via a DB timestamp check to prevent runaway GitHub API consumption.
- **Sync lookback cap:** `lookbackDays` is clamped to `[1, 90]` server-side to prevent abuse of the sync endpoint.

---

## 8. Error Handling & Reliability

| Failure | Behaviour |
|---|---|
| Groq API down or slow | Try/catch at route level — standup/summary saves a fallback string; burnout explanation stores empty string; numeric score unaffected |
| GitHub GraphQL error | Inner try/catch per page — pagination loop breaks, partial data is still upserted |
| Sync too soon | `429` returned with a human-readable message; no GitHub API call made |
| Auth session missing | All API routes return `401` immediately — no DB or external calls |
| Malformed `lookbackDays` | Clamped to `[1, 90]` server-side — no error thrown |
| DB write conflict | Prisma upserts are idempotent — safe to retry; unique constraints prevent duplicate rows |

---

## 9. Deployment

1. Vercel project linked to `github.com/tanisheesh/DevPulse` — auto-deploy on push to `main`.
2. Neon Postgres database provisioned; pooled connection string (pgBouncer mode) used for serverless function compatibility.
3. `prisma generate && prisma migrate deploy` run as part of the Vercel build script — schema stays in sync with each deploy.
4. Env vars in Vercel project dashboard: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GITHUB_ID`, `GITHUB_SECRET`, `GROQ_API_KEY`, `TOKEN_ENCRYPTION_KEY`.

---

## 10. Explicit Scope Cuts

- **Jira / Linear integration** — v1 is GitHub-only. Adding a second data source would require a more complex data model and increases OAuth surface area without clear MVP value.
- **Private repo analytics** — Default OAuth scope is public repos only. Private access requires an explicit UI toggle and user consent; it is not part of the default sign-in flow.
- **Real-time sync via webhooks** — On-demand sync is simpler to reason about and avoids the need for a public webhook endpoint. Webhooks are a v2 candidate once the data model stabilizes.
- **Multi-user team dashboards** — v1 is single-user. Team aggregation requires per-user data isolation at a different granularity and adds billing complexity.

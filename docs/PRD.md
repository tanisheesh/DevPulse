# DevPulse — Product Requirements Document

**Status:** Final
**Owner:** Tanish Poddar
**One-liner:** Turn your GitHub activity into daily standups, weekly summaries, and a burnout signal — automatically.

---

## 1. Problem

Developers waste time every day on two unavoidable rituals: writing standup updates from memory, and guessing whether they are heading toward burnout. Both are solved by data that already exists in GitHub — but no tool closes the loop. Generic productivity dashboards require manual input; GitHub's own graphs are passive and show no AI narrative. DevPulse pulls your real commits and PRs, computes a burnout signal from behavioral patterns, and writes your standup for you — turning activity you've already done into actionable output with zero additional effort.

---

## 2. Goals (v1 / MVP)

1. GitHub OAuth login — no separate signup form, no manual account creation.
2. Pull real commit, PR, and issue data for repos the user selects — no synthetic or placeholder data anywhere in the UI.
3. Generate a grounded AI standup (Yesterday / Today / Blockers) from the previous day's actual activity.
4. Compute a deterministic, auditable burnout score (0–100) based on after-hours and weekend commit patterns against the user's own 60-day baseline.
5. Show commit analytics (heatmap, coding hours, PR cycle time, code churn, commit quality) derived entirely from synced data.
6. Let users set weekly goals for commits, PRs, and issues, with an AI check-in on progress.
7. Deployed with a working live demo URL that any recruiter or interviewer can use with their own GitHub account.

---

## 3. Non-Goals (explicit scope cuts)

- **Jira / Linear / Notion integration** — GitHub-only in v1; a second data source complicates the model and delays ship.
- **Team / org dashboards** — v1 is strictly single-user; multi-user aggregation requires a different data isolation model and billing decisions.
- **Real-time sync via webhooks** — On-demand sync triggered by the user is simpler to reason about and avoids the need for a publicly accessible webhook endpoint.
- **Private repository analytics by default** — Private repo access is an explicit UI opt-in, not part of the default OAuth scope, to minimise what a first-time visitor must grant.
- **Native mobile app** — The web app is responsive and accessible on mobile; a dedicated app is not warranted at this scale.

---

## 4. Users

**Primary:** Individual developers who want their standup written from real commit data, a burnout signal before it becomes a problem, and a dashboard that reflects what they actually shipped — without any manual logging.

**Secondary:** Technical recruiters and hiring managers evaluating this as a portfolio piece — it must work live with real GitHub data, load fast, and be usable without a walkthrough.

---

## 5. User Stories

1. *As a developer,* I sign in with GitHub in one click so that I don't have to create yet another account or remember another password.
2. *As a developer,* I select which repos to track so that only my own work appears in the dashboard, not forks or repos I rarely touch.
3. *As a developer,* I click Sync to pull the last 30 days of activity so that my dashboard is populated with real data in one action.
4. *As a developer,* I click "Generate standup" so that I get a Yesterday / Today / Blockers draft I can paste into Slack without editing.
5. *As a developer,* I view my burnout score so that I can see whether my late-night and weekend commit patterns are trending higher than my own normal baseline.
6. *As a developer,* I set weekly goals for commits, PRs, and issues so that I have a target to track against and an AI check-in to tell me how I'm doing mid-week.
7. *As a developer,* I mark vacation dates as blackout periods so that days off are excluded from my burnout calculation and don't inflate my risk score.
8. *As a developer,* I click "Generate monthly review" so that I have a professional performance paragraph ready for my next 1:1 without spending time writing it.

---

## 6. Functional Requirements

### 6.1 Auth

- GitHub OAuth sign-in with `read:user user:email public_repo` scope.
- GitHub access token encrypted with AES-256-GCM before database storage; plaintext copy removed from the OAuth adapter table immediately after sign-in.
- Session-based auth on all API routes; any missing session returns `401` before any external call is made.

### 6.2 Repository Management

- On first sync, list all public repos from the authenticated user's GitHub account.
- User can toggle any repo's `selectedForSync` flag; only selected repos are included in data pulls.
- Each repo tracks `lastSyncedAt` for display in the dashboard.

### 6.3 Data Sync

- POST `/api/sync` pulls commits, PRs, and issues for all selected repos via GitHub GraphQL (cursor-paginated).
- Only commits authored by the signed-in user's GitHub login are stored.
- Lookback window is configurable per sync (default 30 days, max 90 days, clamped server-side).
- Sync enforces a 2-minute cooldown per user to prevent runaway API usage.
- All records are upserted (idempotent) — re-syncing is safe.

### 6.4 Burnout Score

- Computed deterministically from `CommitRecord.authoredAt` timestamps — no AI involved in the number.
- 14-day rolling window normalized against the user's own trailing 60-day baseline ratio.
- Classifies each commit as after-hours or weekend using the user's configured IANA timezone and work hours.
- Commits on user-configured blackout (vacation) dates are excluded from the calculation.
- Score stored as a `BurnoutSnapshot` per day; history shown as a trend line.
- After the number is computed, Groq writes a single grounded sentence explaining it — model is instructed to reference at least one concrete number from the input.

### 6.5 AI Reports

- **Standup:** Timezone-aware yesterday window; input is commit/PR/issue titles (not diffs); output is Yesterday / Today / Blockers in plain text, under 150 words.
- **Weekly summary:** 7-day window; 3–5 sentence narrative; grounded only in provided counts and titles.
- **Monthly review:** Full calendar-month window; 4–6 sentence professional paragraph; written in third person.
- **PR summarizer:** Input is PR title, description (capped at 800 chars), changed file names, and line counts; output is 2–3 sentences.
- **Goal check-in:** Input is goal type, target, and actual count per type; output is 2–3 encouraging, honest sentences.
- All AI reports are stored in the database after generation; the user can regenerate at any time.
- AI failures degrade gracefully — a fallback string is stored and displayed rather than a 500 error.

### 6.6 Analytics Dashboard

- Commit heatmap: full 365-day grid, cell intensity by commit count.
- Coding hours: hourly commit distribution bar chart, with after-hours hours highlighted relative to user's work schedule.
- PR cycle time: average and median days from open to merge, with a weekly trend line.
- Code churn: lines added vs. deleted per week with a churn ratio.
- Commit quality: percentage of commits with vague messages ("fix", "wip", "update", etc.), shown as a score.

### 6.7 Goal Tracking

- User can set weekly targets for commits, PRs, and issues.
- Dashboard shows actual vs. target counts for the current week.
- AI check-in generates an honest, encouraging 2–3 sentence assessment of goal progress.

### 6.8 Settings

- User can configure IANA timezone (affects burnout classification and standup day boundaries).
- User can configure work start hour and work end hour (affects after-hours detection).
- User can add vacation/blackout date ranges with optional labels; these dates are excluded from burnout calculations.

---

## 7. Non-Functional Requirements

- **Latency:** Sync completes in under 30s for a typical user with 3–5 repos and 30 days of data. AI generation completes in under 5s for standup and summary calls on Groq.
- **Security:** All API keys in server-side env vars only — no `NEXT_PUBLIC_` prefix, never committed, never logged. GitHub tokens encrypted at rest. OAuth scope minimised to public repos by default.
- **Cost:** Prompts send structured titles and counts, not diffs — token usage is predictable and low. Groq free tier is sufficient for demo-level usage.
- **Reliability:** No job silently lost — AI failures write a fallback string rather than leaving the field blank or returning a 500. Sync failures on individual repo pages do not abort the full sync.
- **Privacy:** No raw code or file contents are sent to any AI provider. Only commit message titles, PR titles, issue titles, and aggregate counts.
- **Responsiveness:** Dashboard is usable on mobile; standup report is the primary share-to-Slack use case.

---

## 8. Success Metrics

| Metric | Target |
|---|---|
| First-time login → populated dashboard | Under 60 seconds (sign in + sync) |
| AI standup generation | Under 5 seconds from button click |
| Live demo reliability | Works for any public GitHub account without configuration |
| Burnout score transparency | Every score traceable to raw commit counts visible in the UI |

---

## 9. Risks & Open Questions

- **GitHub API rate limits** — 5000 requests/hr per OAuth token. Mitigated by using GraphQL batch queries (one call per repo per entity type) and capping pagination at 2000 commits / 500 PRs per sync.
- **Groq free-tier rate limits** — Mitigated by on-demand calls only (user must click a button); no AI calls on page load.
- **Neon serverless connection pooling** — Serverless functions create new DB connections per invocation. Mitigated by using the pooled (pgBouncer) connection string and the `@prisma/adapter-pg` driver.
- **Open question:** Should the burnout score eventually gate a "you're trending high — consider scheduling a break" notification, or keep it purely informational to avoid paternalism?

---

## 10. v2 Candidates

- **GitHub webhook integration** — Real-time sync on every push instead of on-demand; requires a public webhook endpoint and HMAC verification.
- **Private repository support** — Full private repo analytics with explicit consent flow; requires a separate OAuth scope toggle and clear data-handling disclosure.
- **Team / org dashboards** — Aggregate view across a GitHub org for engineering managers; requires multi-user data isolation and access control.
- **Jira / Linear integration** — Pull ticket data alongside commit data for a fuller picture of what shipped vs. what was planned.
- **Calendar integration** — Import calendar events to automatically detect meeting-heavy days and factor them into productivity patterns.
- **Nonce-based CSP** — Replace the current `unsafe-inline` allowance (required by Next.js hydration) with proper per-request nonces.

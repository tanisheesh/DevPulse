# Local Setup — DevPulse

> **Just want to try it?** Use the live demo at [devpulse.tanisheesh.in](https://devpulse.tanisheesh.in) — no setup needed.
> This guide is for running DevPulse locally or self-hosting it.

---

## Prerequisites

- Node.js 20+
- A PostgreSQL database — [Neon](https://neon.tech) is recommended (free tier, serverless, works out of the box with the pooled connection string)
- A GitHub account (for creating the OAuth App)
- A [Groq](https://console.groq.com) account (free tier is sufficient)

---

## 1. Clone and install

```bash
git clone https://github.com/tanisheesh/DevPulse
cd DevPulse
npm install
```

---

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [Neon Console](https://console.neon.tech) → your project → Connection Details → **Pooled connection** string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` in your terminal |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev; your Vercel URL in production |
| `GITHUB_ID` | [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New OAuth App → copy Client ID |
| `GITHUB_SECRET` | Same OAuth App → Generate a new client secret |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) — create a new API key |
| `TOKEN_ENCRYPTION_KEY` | Run `openssl rand -base64 32` in your terminal (must decode to ≥ 32 bytes) |

**GitHub OAuth App settings:**
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

---

## 3. Database setup

Run Prisma migrations to create the schema:

```bash
npx prisma migrate dev
```

This creates all tables (User, Repository, CommitRecord, PullRequestRecord, IssueRecord, BurnoutSnapshot, StandupReport, WeeklySummary, MonthlyReview, UserSettings, BlackoutDate, Goal) and generates the Prisma client.

To inspect the database visually:

```bash
npm run db:studio
```

---

## 4. Run locally

```bash
npm run dev
```

DevPulse will be running at `http://localhost:3000`.

Sign in with GitHub → go to Repos → select repos → click Sync. Your dashboard populates from real GitHub data.

---

## 5. Deploy to production

DevPulse is designed for Vercel + Neon:

1. Push the repo to GitHub.
2. Create a new Vercel project linked to the repo.
3. Add all env vars from `.env.local` to the Vercel project dashboard (Settings → Environment Variables). For `NEXTAUTH_URL`, use your Vercel deployment URL.
4. Update your GitHub OAuth App's callback URL to `https://devpulse.tanisheesh.in/api/auth/callback/github` (or your own domain).
5. The build script (`prisma generate && prisma migrate deploy && next build`) runs migrations automatically on every deploy — no manual migration step needed.

---

## Known local-only limitations

- Groq API calls require an internet connection — there is no local mock for AI generation.
- The sync rate-limit (2 minutes) applies locally too — if you need to re-sync immediately during development, update `lastSyncedAt` directly in Prisma Studio or clear the relevant repository row.
- Neon's serverless Postgres may have a cold-start delay on the first query after a period of inactivity — this is expected behavior for the free tier.

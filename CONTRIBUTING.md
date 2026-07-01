# Contributing / Local Setup

This document covers everything needed to run DevPulse locally or contribute to it.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Auth | Auth.js v5 (next-auth@beta) with GitHub OAuth |
| Database | Neon Postgres (serverless, sslmode=verify-full) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| AI | Groq API — Llama 3.3 70B Versatile |
| Styling | Tailwind CSS v4, Apple Liquid Glass design system |
| Charts | Recharts |
| Deploy | Vercel |

## Prerequisites

- Node.js 20+
- A GitHub OAuth App (for auth)
- A Neon Postgres database (free tier works)
- A Groq API key (free tier works)

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/tanisheesh/DevPulse
cd DevPulse
npm install
```

### 2. Create a GitHub OAuth App

Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**:

| Field | Value |
|---|---|
| Application name | DevPulse local |
| Homepage URL | `http://localhost:3001` |
| Authorization callback URL | `http://localhost:3001/api/auth/callback/github` |

Copy the Client ID and generate a Client Secret.

### 3. Create a Neon Postgres database

Sign up at [neon.tech](https://neon.tech), create a project, copy the **pooled connection string**.

### 4. Get a Groq API key

Sign up at [console.groq.com](https://console.groq.com), create an API key.

### 5. Environment variables

Create `.env.local` at the project root:

```env
DATABASE_URL="postgresql://..."       # Neon pooled connection string
AUTH_SECRET="..."                      # openssl rand -base64 32
AUTH_URL="http://localhost:3001"
AUTH_GITHUB_ID="..."
AUTH_GITHUB_SECRET="..."
GROQ_API_KEY="gsk_..."
TOKEN_ENCRYPTION_KEY="..."            # openssl rand -base64 32
```

### 6. Push schema and generate client

```bash
npx prisma db push        # applies schema to your Neon DB
npx prisma generate       # generates Prisma client types
```

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001), sign in with GitHub, import repos, sync.

> The dev server runs on port 3001. Port 3000 is intentionally left free.

## Prisma notes

This project uses Prisma 7's `prisma.config.ts` pattern — the `datasource` URL is **not** in `schema.prisma`. It is read from `DATABASE_URL` at runtime via `prisma.config.ts`. Do not add a `datasource` block to `schema.prisma`.

After any schema change:

```bash
npx prisma db push        # for dev (no migration history)
npx prisma generate       # always run after schema changes
```

For production, run `npx prisma migrate deploy` manually before deploying (migrations do not run automatically during `npm run build`).

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import in the [Vercel dashboard](https://vercel.com/new).
3. Add all env vars under **Project → Settings → Environment Variables**.
   - For `AUTH_URL`: use your Vercel production URL.
   - Create a separate GitHub OAuth App for production with the production callback URL.
4. Run `npx prisma migrate deploy` locally (pointed at the production DB) before the first deploy, or via a separate CI step.

## Architecture notes

### Burnout score

```
riskRatio = unique(lateNight ∪ weekend commits) / totalCommits   [14-day window]
delta     = riskRatio − baselineRiskRatio                        [60-day baseline]
score     = clamp(50 + delta × 100, 0, 100)
```

Late night and weekend are evaluated in the user's local timezone (`Intl.DateTimeFormat`), using the `workStartHour` and `workEndHour` configured in Settings. Blackout dates are excluded before the calculation.

### Token encryption

GitHub access tokens are encrypted with AES-256-GCM using the Web Crypto API before being stored in the database. The encryption key comes from `TOKEN_ENCRYPTION_KEY`. This is safe to run on Vercel's Edge Runtime.

### Middleware

The file is named `proxy.ts` (not `middleware.ts`) to avoid Next.js 16 conflicts. It performs a cookie-based session check with zero Auth.js imports, keeping the middleware bundle small.

## Project structure

```
app/
  api/          API routes (sync, repos, standup, goals, settings, ...)
  dashboard/    Protected dashboard pages (overview, standup, weekly, ...)
  page.tsx      Landing page
  layout.tsx    Root layout (Inter font, session provider)

components/     All UI components
lib/            Business logic (burnout algorithm, Groq helpers, prisma client)
prisma/         Schema, config, migrations
proxy.ts        Edge middleware (auth guard)
```

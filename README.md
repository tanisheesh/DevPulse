<p align="center">
  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"
       fill="none" stroke="#0A84FF" stroke-width="1.5"
       stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
</p>

<h1 align="center">DevPulse</h1>

<p align="center">
  <strong>Turn your GitHub activity into daily standups, weekly summaries, and a burnout signal — automatically.</strong>
</p>

<p align="center">
  <a href="https://devpulse.tanisheesh.in">
    <img src="https://img.shields.io/badge/live_demo-0A84FF-0A84FF?style=flat-square" alt="Live Demo">
  </a>
  <img src="https://img.shields.io/badge/Next.js-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Groq-F55036?style=flat-square" alt="Groq">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/license-GPL--3.0-0A84FF?style=flat-square" alt="License">
</p>

---

## What is DevPulse?

DevPulse connects to your GitHub and turns your real commits, pull requests, and issues into AI-generated standup reports, weekly narratives, and a deterministic burnout score — with zero manual input. Unlike generic productivity tools that ask you to log your day, DevPulse reads your actual activity and derives everything from source: sign in with GitHub, select repos, hit sync, and your dashboard is live.

> **Live demo →** [devpulse.tanisheesh.in](https://devpulse.tanisheesh.in)

---

## What you get

- **AI standup reports** — Yesterday / Today / Blockers written from your previous day's commits and PRs. Paste directly into Slack.
- **Burnout score** — 0–100 signal based on late-night and weekend commits measured against your own 60-day baseline; timezone-aware, vacation-aware, fully auditable.
- **Full commit analytics** — Heatmap, coding hours, PR cycle time, code churn, and commit quality score — all from synced GitHub data.
- **Goal tracking** — Set weekly targets for commits, PRs, and issues. Get an AI check-in on where you stand.
- **Monthly review** — AI-generated performance paragraph grounded in real data, suitable for 1:1s or self-evaluations.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 · App Router · TypeScript 6 · Turbopack |
| Auth | Auth.js v5 · GitHub OAuth |
| Database | Neon Postgres (serverless) · Prisma 7 |
| AI | Groq API · Llama 3.3 70B Versatile |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Infra | Vercel |

---

## Engineering Decisions

**Why a deterministic burnout score instead of asking an AI to judge it?**
The score is computed from raw commit timestamps using a clamped linear scale against the user's own 60-day baseline — no model involved in the number itself. This makes every score auditable and traceable to specific commits, not a black-box model opinion.

**Why Groq + Llama 3.3 70B instead of a hosted OpenAI or Anthropic model?**
Groq's inference speed and free-tier throughput fit the on-demand, per-user-click pattern well. The prompts send structured JSON (commit titles, PR titles, counts) — never raw diffs — so the model doesn't need deep code understanding, making a fast 70B model the right tradeoff.

**Why AES-256-GCM for stored GitHub tokens?**
The GitHub OAuth access token is the most sensitive credential in the system. It is encrypted with AES-256-GCM (random 12-byte IV per token) immediately after OAuth, and the plaintext copy the PrismaAdapter writes to the `Account` table is overwritten to null in the same transaction — so no plaintext token ever persists.

**What would you do differently in v2?**
Add nonce-based CSP headers instead of relying on Next.js hydration's `unsafe-inline` allowance, and add proper rate-limiting middleware rather than the current DB-query-based cooldown check on the sync route.

---

## Docs

| Document | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements — goals, user stories, non-goals |
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, component breakdown |
| [Decisions](docs/DECISIONS.md) | Every major technical decision and why |
| [Setup](docs/SETUP.md) | Local dev setup, env vars, deployment |

---

## Author

**Tanish Poddar** — [tanisheesh.in](https://tanisheesh.in) · [LinkedIn](https://linkedin.com/in/tanisheesh) · [GitHub](https://github.com/tanisheesh)

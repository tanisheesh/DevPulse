# Engineering Decisions — DevPulse

<!--
This is not user documentation. This is for technical interviewers
and senior engineers who want to understand WHY the system is built
the way it is. Every entry should answer a question an interviewer
might ask.
-->

---

## Decision 1 — Deterministic burnout score, not an AI-judged one

**Context:** The burnout feature needed to produce a 0–100 risk number. Two options: ask an LLM to infer a score from commit patterns, or compute it deterministically from raw timestamps.

**Decision:** The score is computed by a pure function in `lib/burnout.ts` using commit timestamps, the user's IANA timezone, and their configured work hours. No model is involved in producing the number. Groq is called *after* the number exists — only to write a one-sentence plain-English explanation that must reference at least one concrete value from the input.

**Reason:** A deterministic score is auditable. The user can always trace a score of, say, 72 back to "10 of your 18 commits in the last 14 days were after 11 PM or on weekends, up from your 30% baseline." An LLM-generated number carries no such guarantee — the model might weigh factors differently on each call, making the score non-reproducible and untrustworthy for the core use case (tracking your own trend over time).

**Tradeoff:** The algorithm is simpler than a model-based approach — it normalizes against the user's own baseline but doesn't account for intentional late-night sprints, deadline weeks, or cross-timezone collaboration. A future model could learn to distinguish "unhealthy overwork" from "deliberate crunch" if given more context. That nuance is a v2 problem.

---

## Decision 2 — Groq + Llama 3.3 70B over a hosted OpenAI or Anthropic model

**Context:** The AI features (standup, weekly summary, PR summarizer, goal check-in) require a chat-completion model. Options included OpenAI GPT-4o, Anthropic Claude, or Groq's hosted open models.

**Decision:** Groq API with `llama-3.3-70b-versatile`.

**Reason:** Three factors drove this. First, Groq's inference speed (sub-2s for the prompt sizes used) fits the on-demand, user-click pattern — standup generation needs to feel instant. Second, all prompts send structured titles and counts rather than raw code, so the task doesn't require frontier model capability; a fast 70B model is the right size. Third, Groq's free tier throughput is sufficient for demo-scale usage without a billing account, which matters for a portfolio project that needs a live demo that works for any visitor.

**Tradeoff:** Llama 3.3 70B is not as capable as GPT-4o or Claude Sonnet for complex reasoning tasks. In practice, all six prompt functions are constrained (short output, structured input, explicit format instructions), so output quality is high and consistent. If a user has extremely sparse commit data, output quality degrades slightly — but this is a data problem, not a model problem.

---

## Decision 3 — AES-256-GCM token encryption for stored GitHub OAuth tokens

**Context:** The GitHub OAuth access token is the most sensitive credential in the system — it grants read access to all of the user's public repos. The PrismaAdapter writes this token to the `Account` table in plaintext by default.

**Decision:** In the Auth.js `signIn` event, the token is encrypted with AES-256-GCM (random 12-byte IV per token) and stored in `User.accessToken`. Immediately after, `Account.access_token` is overwritten to `null` — so no plaintext token persists anywhere in the database. The encryption key (`TOKEN_ENCRYPTION_KEY`) lives only in env vars.

**Reason:** If the database is ever leaked or a read-replica is misconfigured, encrypted tokens are useless without the key. The plaintext wipe of `Account.access_token` closes the gap the PrismaAdapter leaves open. Using Web Crypto (`crypto.subtle`) rather than a third-party library means zero additional dependencies and no version drift.

**Tradeoff:** The encryption adds two async operations to every sign-in. The overhead is negligible (microseconds on Vercel) but it does mean token decryption happens on every GitHub API call (inside `getOctokitForUser`), not just once. The decryption is also async and can fail if the key is missing or malformed — which surfaces as a server error rather than a silent data corruption.

---

## Decision 4 — Structured JSON input to LLM (never raw diffs or file contents)

**Context:** When building AI prompts for standup, summary, and PR summarization, the question was how much raw GitHub data to pass to the model. Options ranged from full diff text to just commit message titles and counts.

**Decision:** All prompts receive structured, title-level data only: commit message first lines (max 280 chars each), PR titles, issue titles, repo names, and aggregate counts. No file contents, no diff hunks, no code snippets.

**Reason:** Three reasons. First, sending raw diffs to a third-party API (Groq) could leak proprietary business logic or sensitive implementation details — even from public repos, the user may not want every line of code shipped to an external service. Second, diffs are large — passing them for a week of commits would blow the context window and cost more tokens than the output is worth. Third, the AI features are about *narrating activity*, not *understanding code* — commit titles and PR titles are sufficient signal for writing "merged 3 PRs, fixed auth bug, opened a new issue for the rate limiter."

**Tradeoff:** The PR summarizer is weaker than it could be. Passing only the PR title, description, and changed filenames means the model can't describe specific code changes. The output is "what this PR does at a high level," not "what specifically changed in auth.ts." This is acceptable for the current use case (quick plain-English summary) but would need raw diffs or file content for a code-review-quality output.

---

## Decision 5 — On-demand sync over webhook-driven real-time sync

**Context:** Keeping the dashboard fresh requires either polling, a user-triggered sync, or GitHub webhooks that push events as they happen.

**Decision:** On-demand sync only. The user clicks a Sync button, which hits `POST /api/sync`.

**Reason:** Webhooks require a stable public URL to receive events, HMAC signature verification, and idempotent event processing — all of which add complexity without clear user benefit at MVP scale. On-demand sync is simpler to reason about: the user knows exactly when data was last pulled (`lastSyncedAt` is displayed in the dashboard), and triggering a sync is a single click. A 2-minute cooldown prevents abuse without degrading the user experience.

**Tradeoff:** The dashboard is not live — it reflects the state at the last sync, not right now. A user who commits and immediately opens the dashboard won't see that commit until they sync. For the primary use case (morning standup, end-of-week summary), this lag is invisible. For a use case that required a truly live dashboard, webhooks or SSE would be necessary.

---

## What I'd do differently in v2

- **Nonce-based CSP** — The current setup allows `unsafe-inline` in the Content Security Policy because Next.js hydration requires it. A proper nonce-based CSP would harden against XSS but requires server-side nonce injection per request, which adds infra complexity.
- **Rate limiting middleware** — The sync cooldown is implemented as a DB query (`findFirst` on `lastSyncedAt`). A proper rate limiter at the edge (e.g., Upstash Redis + Vercel middleware) would be faster, cheaper, and cover all routes — not just sync.
- **Webhook-driven sync** — Replace or supplement on-demand sync with GitHub webhooks for push and PR events. Requires a durable event queue (not just a route handler) so events aren't dropped during cold starts.
- **Streaming AI responses** — The standup and summary panels wait for the full completion before rendering. Streaming would make generation feel faster even if total time is the same.

---

## Explicit non-decisions (deferred to v2)

| Feature | Why deferred |
|---|---|
| Multi-tenant team dashboards | Single-user scope is sufficient for the portfolio use case; team aggregation requires a fundamentally different data access model |
| Private repository support by default | Narrower OAuth scope reduces what a first-time demo visitor must grant; private access is an explicit opt-in toggle available to users who want it |
| Jira / Linear integration | GitHub-only keeps the data model and OAuth surface simple; a second data source doubles the sync complexity |
| Real-time webhooks | On-demand sync ships faster and covers the core use case; real-time is a clear v2 upgrade once the data model is stable |

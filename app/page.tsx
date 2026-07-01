import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import {
  Zap, FileText, BarChart2, Activity, Target,
  Moon, Calendar, GitPullRequest, TrendingUp, Sparkles,
  ArrowRight, CheckCircle2,
} from "lucide-react";

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
import Footer from "@/components/Footer";
import Link from "next/link";

const FEATURES = [
  {
    icon: FileText,
    color: "#0A84FF",
    title: "Auto standup",
    desc: "Yesterday / Today / Blockers written from your commits and PRs. Paste directly into Slack.",
  },
  {
    icon: Sparkles,
    color: "#BF5AF2",
    title: "Weekly AI summary",
    desc: "A narrative paragraph covering the full week — what shipped, what got reviewed, overall output.",
  },
  {
    icon: BarChart2,
    color: "#FF453A",
    title: "Burnout score",
    desc: "0–100 signal based on late-night and weekend commits vs. your own 60-day baseline. Not an absolute judgment.",
  },
  {
    icon: Activity,
    color: "#30D158",
    title: "Commit heatmap",
    desc: "A full year of commit activity at a glance, broken down by day.",
  },
  {
    icon: Moon,
    color: "#FF9F0A",
    title: "Coding hours",
    desc: "Which hours you actually commit, with after-hours flagging relative to your configured work schedule.",
  },
  {
    icon: GitPullRequest,
    color: "#BF5AF2",
    title: "PR cycle time",
    desc: "Average and median days from open to merge, with a weekly trend line.",
  },
  {
    icon: TrendingUp,
    color: "#30D158",
    title: "Code churn",
    desc: "Lines added vs deleted per week with a churn ratio. Spot refactor-heavy weeks.",
  },
  {
    icon: Target,
    color: "#0A84FF",
    title: "Goal tracking",
    desc: "Set weekly targets for commits, PRs, and issues. Track progress with an AI check-in.",
  },
  {
    icon: Calendar,
    color: "#FF9F0A",
    title: "Monthly review",
    desc: "AI-generated performance paragraph suitable for 1:1s, self-reviews, or team updates.",
  },
];

const PERKS = [
  "No manual logging",
  "Works with public repos",
  "Timezone-aware burnout",
  "AI from real activity only",
];

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-dvh flex flex-col">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(7,11,20,0.70)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #0A84FF, #0062CC)",
              boxShadow: "0 0 0 1px rgba(10,132,255,0.4), 0 4px 12px rgba(10,132,255,0.3)",
            }}
          >
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-primary tracking-tight">DevPulse</span>
        </div>

        <Link
          href="https://github.com/tanisheesh/DevPulse"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-glass flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
        >
          <GithubIcon size={15} />
          GitHub
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <main className="flex-1">
        <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-32 overflow-hidden">
          {/* Ambient blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(10,132,255,0.13) 0%, transparent 65%)", filter: "blur(60px)" }} />
            <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(191,90,242,0.10) 0%, transparent 65%)", filter: "blur(60px)" }} />
            <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(48,209,88,0.07) 0%, transparent 65%)", filter: "blur(60px)" }} />
          </div>

          {/* Badge */}
          <div
            className="animate-fade-up inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8"
            style={{
              background: "rgba(10,132,255,0.12)",
              border: "1px solid rgba(10,132,255,0.28)",
              color: "#0A84FF",
              animationDelay: "0ms",
            }}
          >
            <Sparkles size={11} />
            Powered by Groq · Llama 3.3 70B
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-up heading font-bold text-primary max-w-3xl leading-[1.08] tracking-[-0.03em] mb-6"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", animationDelay: "60ms" }}
          >
            Your GitHub activity,<br />
            <span style={{ color: "#0A84FF" }}>turned into intelligence.</span>
          </h1>

          <p
            className="animate-fade-up text-secondary text-lg sm:text-xl max-w-xl leading-relaxed mb-10"
            style={{ animationDelay: "120ms" }}
          >
            AI standup reports, weekly summaries, burnout score, and full commit analytics — all from your real commits and PRs. Zero manual input.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up flex flex-col sm:flex-row items-center gap-3 mb-10" style={{ animationDelay: "180ms" }}>
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="btn-primary flex items-center gap-2.5 rounded-2xl px-7 py-3.5 text-base font-semibold"
              >
                <GithubIcon size={18} />
                Sign in with GitHub
                <ArrowRight size={15} />
              </button>
            </form>

            <Link
              href="https://github.com/tanisheesh/DevPulse"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass flex items-center gap-2 rounded-2xl px-7 py-3.5 text-base font-medium"
            >
              View source
            </Link>
          </div>

          {/* Perks */}
          <div
            className="animate-fade-up flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            style={{ animationDelay: "240ms" }}
          >
            {PERKS.map((p) => (
              <span key={p} className="flex items-center gap-1.5 text-xs text-tertiary">
                <CheckCircle2 size={12} style={{ color: "#30D158" }} />
                {p}
              </span>
            ))}
          </div>
        </section>

        {/* ── Features grid ───────────────────────────────────────── */}
        <section className="px-4 pb-28 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3">Everything included</p>
            <h2 className="heading text-primary font-bold text-3xl sm:text-4xl tracking-tight">
              One sync. Full picture.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, color, title, desc }, i) => (
              <div
                key={title}
                className="glass rounded-2xl p-6 animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: `${color}18`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <p className="font-semibold text-primary mb-1.5">{title}</p>
                <p className="text-secondary text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ──────────────────────────────────────────── */}
        <section className="px-4 pb-28 text-center">
          <div
            className="glass max-w-2xl mx-auto rounded-3xl px-8 py-12"
            style={{ boxShadow: "0 0 80px rgba(10,132,255,0.08)" }}
          >
            <h2 className="heading font-bold text-primary text-3xl sm:text-4xl tracking-tight mb-4">
              Ready to see your data?
            </h2>
            <p className="text-secondary mb-8 leading-relaxed">
              Connect GitHub in one click. No setup, no config — your dashboard populates from real activity.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold"
              >
                <GithubIcon size={18} />
                Get started with GitHub
                <ArrowRight size={15} />
              </button>
            </form>
            <p className="text-tertiary text-xs mt-5">
              Requests <code className="text-secondary">read:user</code> and <code className="text-secondary">public_repo</code> scopes · Your data stays yours
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

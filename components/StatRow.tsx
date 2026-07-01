import { GitCommit, GitPullRequest, CircleDot } from "lucide-react";

interface Props {
  commitCount: number;
  prCount: number;
  issueCount: number;
  days: number;
}

const STATS = [
  { key: "commits" as const, icon: GitCommit, label: "Commits", color: "#0A84FF", glow: "rgba(10,132,255,0.2)" },
  { key: "prs" as const, icon: GitPullRequest, label: "Pull Requests", color: "#BF5AF2", glow: "rgba(191,90,242,0.2)" },
  { key: "issues" as const, icon: CircleDot, label: "Issues", color: "#30D158", glow: "rgba(48,209,88,0.2)" },
];

export default function StatRow({ commitCount, prCount, issueCount, days }: Props) {
  const values = { commits: commitCount, prs: prCount, issues: issueCount };

  return (
    <div className="grid grid-cols-3 gap-4">
      {STATS.map(({ key, icon: Icon, label, color, glow }) => (
        <div
          key={key}
          className="glass rounded-2xl p-5"
          style={{ transition: "transform 0.2s cubic-bezier(0.34,1.3,0.64,1)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
            style={{
              background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
              boxShadow: `0 0 16px ${glow}`,
            }}
          >
            <Icon size={18} style={{ color }} />
          </div>
          <p className="text-3xl font-bold heading text-primary">{values[key]}</p>
          <p className="text-secondary text-xs mt-1">
            {label} · last {days}d
          </p>
        </div>
      ))}
    </div>
  );
}

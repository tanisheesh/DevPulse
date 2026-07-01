interface Props {
  score: number;
  total: number;
  vagueCount: number;
  vagueExamples: string[];
}

function scoreColor(score: number) {
  if (score >= 80) return "#30D158";
  if (score >= 60) return "#FF9F0A";
  return "#FF453A";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Good";
  if (score >= 60) return "Needs work";
  return "Poor";
}

export default function CommitQuality({ score, total, vagueCount, vagueExamples }: Props) {
  const color = scoreColor(score);
  const circumference = 2 * Math.PI * 28;
  const progress = (score / 100) * circumference;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          Message Quality
        </p>
        <p className="text-xs text-tertiary">{total} commits analyzed</p>
      </div>

      <div className="flex items-center gap-6">
        {/* Ring */}
        <svg width={72} height={72} className="shrink-0 -rotate-90">
          <circle cx={36} cy={36} r={28} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
          <circle
            cx={36}
            cy={36}
            r={28}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div>
          <p className="text-4xl font-bold heading" style={{ color }}>{score}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color }}>{scoreLabel(score)}</p>
          {vagueCount > 0 && (
            <p className="text-xs text-secondary mt-1">
              {vagueCount} vague message{vagueCount !== 1 ? "s" : ""} flagged
            </p>
          )}
        </div>
      </div>

      {vagueExamples.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-tertiary mb-2">Flagged messages:</p>
          <div className="flex flex-wrap gap-1.5">
            {vagueExamples.slice(0, 6).map((ex, i) => (
              <span
                key={i}
                className="text-[11px] rounded-lg px-2 py-1"
                style={{
                  background: "rgba(255,69,58,0.12)",
                  border: "1px solid rgba(255,69,58,0.2)",
                  color: "#FF453A",
                }}
              >
                {ex}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

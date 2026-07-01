"use client";

import { format, addDays, startOfWeek, subDays } from "date-fns";

interface Props {
  data: Record<string, number>; // "yyyy-MM-dd" → count
}

function getColor(count: number): string {
  if (count === 0) return "rgba(255,255,255,0.05)";
  if (count <= 2)  return "rgba(10,132,255,0.25)";
  if (count <= 5)  return "rgba(10,132,255,0.50)";
  if (count <= 9)  return "rgba(10,132,255,0.75)";
  return "rgba(10,132,255,0.95)";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function CommitHeatmap({ data }: Props) {
  const today = new Date();
  const gridStart = startOfWeek(subDays(today, 364), { weekStartsOn: 0 });

  // Build weeks array
  const weeks: { date: Date; count: number; key: string }[][] = [];
  let week: { date: Date; count: number; key: string }[] = [];
  let monthLabels: { month: string; col: number }[] = [];
  let lastMonth = -1;

  for (let i = 0; i < 371; i++) {
    const date = addDays(gridStart, i);
    if (date > today) break;
    const key = format(date, "yyyy-MM-dd");
    const month = date.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ month: MONTHS[month], col: Math.floor(i / 7) });
      lastMonth = month;
    }
    week.push({ date, count: data[key] ?? 0, key });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push(week);

  const total = Object.values(data).reduce((s, c) => s + c, 0);
  const activeDays = Object.values(data).filter((c) => c > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
          Commit Activity
        </p>
        <p className="text-xs text-tertiary">
          {total} commits · {activeDays} active days
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        {/* Month labels */}
        <div className="flex mb-1" style={{ paddingLeft: 28 }}>
          {monthLabels.map((m, i) => (
            <div
              key={i}
              className="text-[10px] text-tertiary"
              style={{ minWidth: 28 }}
            >
              {m.month}
            </div>
          ))}
        </div>

        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1">
            {DAYS.map((d, i) => (
              <div
                key={d}
                className="text-[9px] text-tertiary flex items-center"
                style={{ height: 12, visibility: i % 2 === 1 ? "visible" : "hidden" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {weeks.map((wk, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {wk.map(({ date, count, key }) => (
                <div
                  key={key}
                  title={`${format(date, "MMM d, yyyy")}: ${count} commit${count !== 1 ? "s" : ""}`}
                  className="rounded-sm cursor-default transition-transform hover:scale-125"
                  style={{
                    width: 12,
                    height: 12,
                    background: getColor(count),
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[10px] text-tertiary">Less</span>
        {[0, 2, 5, 9, 10].map((n) => (
          <div
            key={n}
            className="rounded-sm"
            style={{ width: 10, height: 10, background: getColor(n), border: "1px solid rgba(255,255,255,0.04)" }}
          />
        ))}
        <span className="text-[10px] text-tertiary">More</span>
      </div>
    </div>
  );
}

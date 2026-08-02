import { CommitRecord } from "@prisma/client";
import { subDays } from "date-fns";

function getLocalHourAndDay(date: Date, timezone: string): { hour: number; dayOfWeek: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    weekday: "short",
    hour12: false,
    timeZone: timezone,
  });
  const parts = fmt.formatToParts(date);
  const rawHour = parts.find((p) => p.type === "hour")?.value ?? "0";
  const hour = parseInt(rawHour) % 24; // "24" → 0 midnight edge case
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayStr);
  return { hour, dayOfWeek: dayOfWeek === -1 ? 1 : dayOfWeek };
}

interface BurnoutSettings {
  timezone: string;
  workStartHour: number; // work day start hour (e.g. 9)
  workEndHour: number;   // hour when late-night begins (e.g. 23 = 11pm)
}

const DEFAULTS: BurnoutSettings = {
  timezone: "UTC",
  workStartHour: 9,
  workEndHour: 23,
};

function isAfterHours(date: Date, settings: BurnoutSettings): boolean {
  const { hour } = getLocalHourAndDay(date, settings.timezone);
  // After-hours = before workStart OR at/after workEnd
  return hour < settings.workStartHour || hour >= settings.workEndHour;
}

function isWeekend(date: Date, settings: BurnoutSettings): boolean {
  const { dayOfWeek } = getLocalHourAndDay(date, settings.timezone);
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function classifyCommits(
  commits: CommitRecord[],
  settings: BurnoutSettings
): { lateNight: number; weekend: number; total: number; riskRatio: number } {
  const total = commits.length;
  if (total === 0) return { lateNight: 0, weekend: 0, total: 0, riskRatio: 0 };

  const riskSet = new Set<string>();
  let lateNight = 0;
  let weekend = 0;

  for (const c of commits) {
    const d = new Date(c.authoredAt);
    const ln = isAfterHours(d, settings);
    const we = isWeekend(d, settings);
    if (ln) lateNight++;
    if (we) weekend++;
    if (ln || we) riskSet.add(c.id);
  }

  return { lateNight, weekend, total, riskRatio: riskSet.size / total };
}

export function computeBurnoutScore(
  recentCommits: CommitRecord[],
  baselineCommits: CommitRecord[],
  settings?: Partial<BurnoutSettings>
): {
  score: number;
  lateNightCommitCount: number;
  weekendCommitCount: number;
  totalCommitCount: number;
  baselineRatio: number;
} {
  const cfg: BurnoutSettings = { ...DEFAULTS, ...settings };
  const recent = classifyCommits(recentCommits, cfg);
  const baseline = classifyCommits(baselineCommits, cfg);

  if (recent.total === 0) {
    return {
      score: 0,
      lateNightCommitCount: 0,
      weekendCommitCount: 0,
      totalCommitCount: 0,
      baselineRatio: baseline.riskRatio,
    };
  }

  const delta = recent.riskRatio - baseline.riskRatio;
  const raw = 50 + delta * 100;
  const score = Math.min(100, Math.max(0, Math.round(raw)));

  return {
    score,
    lateNightCommitCount: recent.lateNight,
    weekendCommitCount: recent.weekend,
    totalCommitCount: recent.total,
    baselineRatio: baseline.riskRatio,
  };
}

export function getWindowDates() {
  const now = new Date();
  return {
    recentStart: subDays(now, 14),
    baselineStart: subDays(now, 60),
  };
}

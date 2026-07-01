/**
 * Returns the UTC timestamp corresponding to midnight in `timezone` on the local calendar
 * day given by `localDateStr` ("YYYY-MM-DD"). Handles all UTC offsets (including UTC+14
 * and UTC-12) by computing the timezone offset from a midday anchor rather than midnight,
 * avoiding DST ambiguity at the hour boundaries.
 */
export function localMidnightUTC(localDateStr: string, timezone: string): Date {
  const noon = new Date(`${localDateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
    hour12: false,
  }).formatToParts(noon);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const rawHour = parseInt(get("hour"));
  // Build a Date treating local-timezone noon components as UTC values to extract the offset.
  // rawHour === 24 is an Intl edge case for midnight overflow — Date auto-rolls the day.
  const localNoonAsUTC = new Date(Date.UTC(
    parseInt(get("year")),
    parseInt(get("month")) - 1,
    rawHour === 24 ? parseInt(get("day")) + 1 : parseInt(get("day")),
    rawHour === 24 ? 0 : rawHour,
    parseInt(get("minute")),
  ));
  const offsetMs = localNoonAsUTC.getTime() - noon.getTime();
  return new Date(new Date(`${localDateStr}T00:00:00Z`).getTime() - offsetMs);
}

/**
 * Returns { today, yesterday } as UTC Date objects for midnight boundaries in `timezone`.
 *
 * These are safe to pass to Prisma for `@db.Date` queries — Prisma uses the UTC calendar
 * date of the timestamp, which is the same UTC date the standup/burnout APIs store.
 * This ensures the page-load lookup and the API-side write always agree on the date key.
 */
export function dayBoundariesInTz(timezone: string): { today: Date; yesterday: Date } {
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const todayStr = dateFmt.format(new Date());
  const today = localMidnightUTC(todayStr, timezone);
  const yesterday = new Date(today.getTime() - 86_400_000);
  return { today, yesterday };
}

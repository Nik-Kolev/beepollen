const BACKUP_NAME = /^beepollen-(\d{4}-\d{2}-\d{2})\.db$/;

export const KEEP_DAILY = 7;
export const KEEP_WEEKLY = 4;
export const KEEP_MONTHLY = 3;

const SOFIA_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Sofia",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function sofiaDate(now: Date): string {
  return SOFIA_DATE.format(now);
}

export function backupName(date: string): string {
  return `beepollen-${date}.db`;
}

function isCalendarDate(date: string): boolean {
  const time = Date.parse(`${date}T00:00:00Z`);

  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(date);
}

function weekOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));

  return day.toISOString().slice(0, 10);
}

function newestPerPeriod(
  dates: string[],
  period: (date: string) => string,
  count: number,
): string[] {
  const kept = new Map<string, string>();

  for (const date of dates) {
    const key = period(date);
    if (!kept.has(key)) kept.set(key, date);
    if (kept.size === count) break;
  }

  return [...kept.values()];
}

export function backupsToPrune(names: string[]): string[] {
  const dated = names
    .map((name) => ({ name, date: BACKUP_NAME.exec(name)?.[1] }))
    .filter(
      (entry): entry is { name: string; date: string } =>
        entry.date !== undefined && isCalendarDate(entry.date),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const dates = dated.map((entry) => entry.date);
  const kept = new Set([
    ...newestPerPeriod(dates, (date) => date, KEEP_DAILY),
    ...newestPerPeriod(dates, weekOf, KEEP_WEEKLY),
    ...newestPerPeriod(dates, (date) => date.slice(0, 7), KEEP_MONTHLY),
  ]);

  return dated
    .filter((entry) => !kept.has(entry.date))
    .map((entry) => entry.name);
}

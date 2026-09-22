/** The fixed operational date keeps the local demo data deterministic. */
export const operationalDateISO = "2026-09-16";

function parseISODate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00Z`);
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(dateISO: string, days: number) {
  const date = parseISODate(dateISO);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function isSameOperationalDay(dateISO: string, offset = 0) {
  return dateISO === addCalendarDays(operationalDateISO, offset);
}

export function isAfterOperationalTomorrow(dateISO: string) {
  return parseISODate(dateISO).getTime() > parseISODate(addCalendarDays(operationalDateISO, 1)).getTime();
}

export function isInOperationalWeek(dateISO: string) {
  const current = parseISODate(operationalDateISO);
  const mondayOffset = (current.getUTCDay() + 6) % 7;
  const weekStart = new Date(current);
  weekStart.setUTCDate(current.getUTCDate() - mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  const candidate = parseISODate(dateISO);
  return candidate.getTime() >= weekStart.getTime() && candidate.getTime() <= weekEnd.getTime();
}

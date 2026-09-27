const jakartaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Returns the current business date in Asia/Jakarta as YYYY-MM-DD. */
export function getOperationalDateISO(now = new Date()) {
  const parts = jakartaDateFormatter
    .formatToParts(now)
    .reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

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

export function isSameOperationalDay(dateISO: string, offset = 0, operationalDate = getOperationalDateISO()) {
  return dateISO === addCalendarDays(operationalDate, offset);
}

export function isAfterOperationalTomorrow(dateISO: string, operationalDate = getOperationalDateISO()) {
  return parseISODate(dateISO).getTime() > parseISODate(addCalendarDays(operationalDate, 1)).getTime();
}

export function isInOperationalWeek(dateISO: string, operationalDate = getOperationalDateISO()) {
  const current = parseISODate(operationalDate);
  const mondayOffset = (current.getUTCDay() + 6) % 7;
  const weekStart = new Date(current);
  weekStart.setUTCDate(current.getUTCDate() - mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  const candidate = parseISODate(dateISO);
  return candidate.getTime() >= weekStart.getTime() && candidate.getTime() <= weekEnd.getTime();
}

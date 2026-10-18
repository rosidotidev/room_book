/**
 * Office-zone time helpers. The API returns times with the office offset and expects an offset on input;
 * the browser may be in another zone, so every conversion goes through the office zone explicitly.
 * Every function that depends on "now" takes it as an argument, so tests use fixed instants.
 */
export const OFFICE_ZONE = 'Europe/Rome';
export const DAY_START_MINUTES = 8 * 60;
export const DAY_END_MINUTES = 20 * 60;
export const SLOT_MINUTES = 15;
export const CANCELLATION_WINDOW_MINUTES = 60;

export interface DateTime {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: OFFICE_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function officeFields(instant: Date): Record<string, number> {
  const fields: Record<string, number> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') {
      fields[part.type] = Number(part.value);
    }
  }
  return fields;
}

/** Offset of the office zone from UTC, in minutes, at the given instant. */
export function officeOffsetMinutes(instantMs: number): number {
  const f = officeFields(new Date(instantMs));
  const asUtc = Date.UTC(f['year'], f['month'] - 1, f['day'], f['hour'], f['minute'], f['second']);
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / 60000);
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** The current office-local date and time. */
export function nowInOffice(now: Date): DateTime {
  const f = officeFields(now);
  return { date: `${f['year']}-${pad(f['month'])}-${pad(f['day'])}`, time: `${pad(f['hour'])}:${pad(f['minute'])}` };
}

/** ISO date-time with the office offset for an office-local date and time ("2026-10-20", "10:00"). */
export function toOfficeIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, h, mi);
  let offset = officeOffsetMinutes(naive);
  offset = officeOffsetMinutes(naive - offset * 60000);
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return `${date}T${pad(h)}:${pad(mi)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Date and time of a string returned by the API; it already carries the office offset. */
export function officeParts(iso: string): DateTime {
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeOf(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function isWorkingDay(date: string): boolean {
  const day = weekday(date);
  return day >= 1 && day <= 5;
}

/** The date itself on a working day, otherwise the next Monday. */
export function nextWorkingDay(date: string): string {
  let d = date;
  while (!isWorkingDay(d)) {
    d = addDays(d, 1);
  }
  return d;
}

/** Monday of the week containing the date. */
export function mondayOf(date: string): string {
  const day = weekday(date);
  return addDays(date, day === 0 ? -6 : 1 - day);
}

/** Cancel is allowed when at least 60 minutes remain before the start (exactly 60 included). */
export function canCancel(startIso: string, now: Date): boolean {
  return Date.parse(startIso) - now.getTime() >= CANCELLATION_WINDOW_MINUTES * 60000;
}

export function hasStarted(startIso: string, now: Date): boolean {
  return Date.parse(startIso) <= now.getTime();
}

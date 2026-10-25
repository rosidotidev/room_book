/** Business hours and booking days are evaluated in this zone (FR-017). */
export const OFFICE_TIME_ZONE = 'Europe/Rome';

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: OFFICE_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

interface OfficeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Drops milliseconds; stored and serialized instants have whole seconds only. */
function wholeSecondMs(instant: Date): number {
  return Math.floor(instant.getTime() / 1000) * 1000;
}

function officeParts(instant: Date): OfficeParts {
  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(wholeSecondMs(instant)))) {
    values[part.type] = part.value;
  }
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

/** Monday = 1 ... Sunday = 7. */
export function officeWeekday(instant: Date): number {
  const { year, month, day } = officeParts(instant);
  const sundayBased = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return sundayBased === 0 ? 7 : sundayBased;
}

export function officeMinutesOfDay(instant: Date): number {
  const { hour, minute } = officeParts(instant);
  return hour * 60 + minute;
}

/** Seconds since office-local midnight, 0 to 86399. */
export function officeSecondsOfDay(instant: Date): number {
  const { hour, minute, second } = officeParts(instant);
  return hour * 3600 + minute * 60 + second;
}

/** yyyy-MM-dd */
export function officeDate(instant: Date): string {
  const { year, month, day } = officeParts(instant);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** The zone offset in force at that instant, in minutes east of UTC (handles DST). */
export function officeOffsetMinutes(instant: Date): number {
  const p = officeParts(instant);
  const wallClockAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (wallClockAsUtc - wholeSecondMs(instant)) / 60000;
}

/** +HH:MM or -HH:MM, the zone offset in force at that instant. */
export function officeOffset(instant: Date): string {
  const offsetMinutes = officeOffsetMinutes(instant);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** The instant of office-local midnight that starts the given yyyy-MM-dd day. */
export function officeMidnight(day: string): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, dayOfMonth);
  // Two passes: the offset is read first at the naive instant, then at the corrected one.
  const first = wallClockAsUtc - officeOffsetMinutes(new Date(wallClockAsUtc)) * 60000;
  return new Date(wallClockAsUtc - officeOffsetMinutes(new Date(first)) * 60000);
}

/** The yyyy-MM-dd day after the given one (calendar arithmetic, no zone involved). */
export function nextDay(day: string): string {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, dayOfMonth + 1)).toISOString().slice(0, 10);
}

/** YYYY-MM-DDTHH:mm:ss+HH:MM in office time, seconds kept, no fractional part. */
export function formatOfficeDateTime(instant: Date): string {
  const p = officeParts(instant);
  return `${officeDate(instant)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}${officeOffset(instant)}`;
}

import { describe, expect, it } from 'vitest';
import {
  addDays,
  canCancel,
  hasStarted,
  isWorkingDay,
  mondayOf,
  nextWorkingDay,
  nowInOffice,
  officeParts,
  toOfficeIso,
} from './office-time';

describe('office-time', () => {
  it('builds ISO strings with the summer and the winter office offset', () => {
    expect(toOfficeIso('2026-10-20', '10:00')).toBe('2026-10-20T10:00:00+02:00');
    expect(toOfficeIso('2026-10-26', '10:00')).toBe('2026-10-26T10:00:00+01:00');
    expect(toOfficeIso('2026-01-12', '08:15')).toBe('2026-01-12T08:15:00+01:00');
  });

  it('uses the right offset on both sides of the daylight-saving change (25 October 2026)', () => {
    expect(toOfficeIso('2026-10-24', '19:45')).toBe('2026-10-24T19:45:00+02:00');
    expect(toOfficeIso('2026-10-26', '08:00')).toBe('2026-10-26T08:00:00+01:00');
    expect(Date.parse(toOfficeIso('2026-10-26', '08:00'))).toBe(Date.parse('2026-10-26T07:00:00Z'));
  });

  it('reads the date and time of a returned string without any zone conversion', () => {
    expect(officeParts('2026-10-20T10:15:00+02:00')).toEqual({ date: '2026-10-20', time: '10:15' });
  });

  it('gives the office date and time whatever the browser zone is', () => {
    // 23:30 UTC on 19 October is already 01:30 on 20 October in Rome (+02:00)
    expect(nowInOffice(new Date('2026-10-19T23:30:00Z'))).toEqual({ date: '2026-10-20', time: '01:30' });
    expect(nowInOffice(new Date('2026-10-19T09:00:00Z'))).toEqual({ date: '2026-10-19', time: '11:00' });
  });

  it('knows working days and the next Monday', () => {
    expect(isWorkingDay('2026-10-19')).toBe(true); // Monday
    expect(isWorkingDay('2026-10-23')).toBe(true); // Friday
    expect(isWorkingDay('2026-10-24')).toBe(false); // Saturday
    expect(isWorkingDay('2026-10-25')).toBe(false); // Sunday
    expect(nextWorkingDay('2026-10-24')).toBe('2026-10-26');
    expect(nextWorkingDay('2026-10-25')).toBe('2026-10-26');
    expect(nextWorkingDay('2026-10-21')).toBe('2026-10-21');
  });

  it('computes days and weeks', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(mondayOf('2026-10-22')).toBe('2026-10-19');
    expect(mondayOf('2026-10-25')).toBe('2026-10-19'); // Sunday belongs to the previous week
  });

  it('allows cancelling only while at least 60 minutes remain', () => {
    const now = new Date('2026-10-20T08:00:00Z'); // 10:00 office time
    expect(canCancel('2026-10-20T11:01:00+02:00', now)).toBe(true); // 61 minutes
    expect(canCancel('2026-10-20T11:00:00+02:00', now)).toBe(true); // exactly 60
    expect(canCancel('2026-10-20T10:59:00+02:00', now)).toBe(false); // 59
    expect(canCancel('2026-10-20T10:00:00+02:00', now)).toBe(false); // starting now
    expect(canCancel('2026-10-20T09:00:00+02:00', now)).toBe(false); // already started
  });

  it('tells whether a booking has started', () => {
    const now = new Date('2026-10-20T08:00:00Z');
    expect(hasStarted('2026-10-20T10:00:00+02:00', now)).toBe(true);
    expect(hasStarted('2026-10-20T10:15:00+02:00', now)).toBe(false);
  });
});

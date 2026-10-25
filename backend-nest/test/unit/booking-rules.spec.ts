import { canCancel, validateBookingWindow } from '../../src/bookings/booking-rules.js';
import { DomainError } from '../../src/common/problem.js';
import { FixedClock } from '../support/fixed-clock.js';

// Tuesday 2026-10-20 11:00 office time (CEST). Bookings below are on Tuesday 2026-10-27 (CET) unless noted.
const clock = new FixedClock('2026-10-20T09:00:00Z');

/** Runs the rule at the fixed clock's instant and returns the rejection; fails the test if it is accepted. */
function rejection(start: string, end: string, now: Date = clock.now()): DomainError {
  try {
    validateBookingWindow(new Date(start), new Date(end), now);
  } catch (error) {
    return error as DomainError;
  }
  throw new Error(`expected ${start} to ${end} to be rejected`);
}

describe('booking rules (US3, data-model.md validation order)', () => {
  it('accepts a weekday booking from 19:45 to 20:00', () => {
    expect(() =>
      validateBookingWindow(new Date('2026-10-27T19:45:00+01:00'), new Date('2026-10-27T20:00:00+01:00'), clock.now()),
    ).not.toThrow();
  });

  it('accepts a booking starting at the opening time 08:00', () => {
    expect(() =>
      validateBookingWindow(new Date('2026-10-27T08:00:00+01:00'), new Date('2026-10-27T08:15:00+01:00'), clock.now()),
    ).not.toThrow();
  });

  it('rejects an end at 20:15 with the opening-hours message', () => {
    expect(rejection('2026-10-27T19:30:00+01:00', '2026-10-27T20:15:00+01:00')).toMatchObject({
      status: 400,
      title: 'Booking not allowed',
      detail: 'Bookings must start and end between 08:00 and 20:00.',
    });
  });

  it('rejects a Saturday booking with the weekday message', () => {
    expect(rejection('2026-10-31T10:00:00+01:00', '2026-10-31T11:00:00+01:00')).toMatchObject({
      status: 400,
      title: 'Booking not allowed',
      detail: 'Bookings are only possible from Monday to Friday.',
    });
  });

  it('rejects a booking of 4 hours 15 minutes', () => {
    expect(rejection('2026-10-27T08:00:00+01:00', '2026-10-27T12:15:00+01:00')).toMatchObject({
      status: 400,
      detail: 'A booking can last at most 4 hours.',
    });
  });

  it('accepts a booking of exactly 4 hours', () => {
    expect(() =>
      validateBookingWindow(new Date('2026-10-27T08:00:00+01:00'), new Date('2026-10-27T12:00:00+01:00'), clock.now()),
    ).not.toThrow();
  });

  it('accepts a start equal to the current instant', () => {
    const now = new Date('2026-10-27T08:00:00+01:00');

    expect(() =>
      validateBookingWindow(new Date('2026-10-27T08:00:00+01:00'), new Date('2026-10-27T09:00:00+01:00'), now),
    ).not.toThrow();
  });

  it('rejects a start before the current instant', () => {
    const now = new Date('2026-10-27T08:30:00+01:00');

    expect(rejection('2026-10-27T08:15:00+01:00', '2026-10-27T09:00:00+01:00', now)).toMatchObject({
      status: 400,
      detail: 'A booking cannot start in the past.',
    });
  });

  it('rejects a booking that crosses midnight with the same-day message', () => {
    // 19:45 Tuesday to 20:00 Wednesday: both ends are inside opening hours on a weekday, so only the day rule fails.
    expect(rejection('2026-10-27T19:45:00+01:00', '2026-10-28T20:00:00+01:00')).toMatchObject({
      status: 400,
      detail: 'A booking must start and end on the same day.',
    });
  });

  it('rejects an end equal to the start', () => {
    expect(rejection('2026-10-27T10:00:00+01:00', '2026-10-27T10:00:00+01:00')).toMatchObject({
      status: 400,
      detail: 'A booking must end after it starts.',
    });
  });

  it('rejects a minute that is not on a 15-minute boundary', () => {
    expect(rejection('2026-10-27T10:10:00+01:00', '2026-10-27T11:00:00+01:00')).toMatchObject({
      status: 400,
      detail: 'Bookings must start and end on a 15-minute boundary (:00, :15, :30, :45).',
    });
  });

  it('applies the weekday rule in office time: a Friday UTC instant that is Saturday in Rome is rejected', () => {
    // 2026-10-23 22:30 UTC is Friday in UTC but Saturday 00:30 in Europe/Rome.
    expect(rejection('2026-10-23T22:30:00Z', '2026-10-23T23:30:00Z')).toMatchObject({
      status: 400,
      detail: 'Bookings are only possible from Monday to Friday.',
    });
  });

  it('keeps the 4-hour limit in elapsed time on a day after the DST change (Monday 2026-10-26, CET)', () => {
    expect(() =>
      validateBookingWindow(new Date('2026-10-26T08:00:00+01:00'), new Date('2026-10-26T12:00:00+01:00'), clock.now()),
    ).not.toThrow();
    expect(rejection('2026-10-26T08:00:00+01:00', '2026-10-26T12:15:00+01:00')).toMatchObject({
      detail: 'A booking can last at most 4 hours.',
    });
  });

  it('rejects the DST change day itself (Sunday 2026-10-25) as a weekend day', () => {
    // Every European DST change falls on a Sunday, so the weekday rule always applies first on those days.
    expect(rejection('2026-10-25T09:00:00+01:00', '2026-10-25T10:00:00+01:00')).toMatchObject({
      detail: 'Bookings are only possible from Monday to Friday.',
    });
  });
});

describe('cancellation window (US3, FR cancel rule)', () => {
  const start = new Date('2026-10-20T13:00:00+02:00'); // 11:00Z

  it('refuses 59 minutes before the start', () => {
    expect(canCancel(start, new Date('2026-10-20T10:01:00Z'))).toBe(false);
  });

  it('allows exactly 60 minutes before the start', () => {
    expect(canCancel(start, new Date('2026-10-20T10:00:00Z'))).toBe(true);
  });
});

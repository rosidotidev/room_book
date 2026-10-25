import { officeDate, officeSecondsOfDay, officeWeekday } from '../common/office-time.js';
import { bookingNotAllowed } from '../common/problem.js';

// Office-time limits (data-model.md, validation order). Business messages are copied from BookingRules.java.
const OPENING_SECONDS = 8 * 3600;
const CLOSING_SECONDS = 20 * 3600;
const SLOT_SECONDS = 15 * 60;
const MAX_DURATION_MS = 4 * 3600 * 1000;
const CANCELLATION_WINDOW_MS = 60 * 60 * 1000;

const SATURDAY = 6;
const SUNDAY = 7;

/**
 * Time rules of a booking, checked in this order: weekday, opening hours, 15-minute boundaries,
 * same office-local day, end after start, duration of at most 4 hours (elapsed), not in the past.
 * `now` comes from the Clock; nothing here reads the system time.
 */
export function validateBookingWindow(start: Date, end: Date, now: Date): void {
  if (isWeekend(start) || isWeekend(end)) {
    throw bookingNotAllowed('Bookings are only possible from Monday to Friday.');
  }
  if (!withinOpeningHours(start) || !withinOpeningHours(end)) {
    throw bookingNotAllowed('Bookings must start and end between 08:00 and 20:00.');
  }
  if (!onSlotBoundary(start) || !onSlotBoundary(end)) {
    throw bookingNotAllowed('Bookings must start and end on a 15-minute boundary (:00, :15, :30, :45).');
  }
  if (officeDate(start) !== officeDate(end)) {
    throw bookingNotAllowed('A booking must start and end on the same day.');
  }
  if (end.getTime() <= start.getTime()) {
    throw bookingNotAllowed('A booking must end after it starts.');
  }
  if (end.getTime() - start.getTime() > MAX_DURATION_MS) {
    throw bookingNotAllowed('A booking can last at most 4 hours.');
  }
  if (start.getTime() < now.getTime()) {
    throw bookingNotAllowed('A booking cannot start in the past.');
  }
}

/** Cancellation is allowed while at least 60 minutes remain before the start. */
export function canCancel(start: Date, now: Date): boolean {
  return start.getTime() - now.getTime() >= CANCELLATION_WINDOW_MS;
}

function isWeekend(instant: Date): boolean {
  const weekday = officeWeekday(instant);
  return weekday === SATURDAY || weekday === SUNDAY;
}

function withinOpeningHours(instant: Date): boolean {
  const seconds = officeSecondsOfDay(instant);
  return seconds >= OPENING_SECONDS && seconds <= CLOSING_SECONDS;
}

/** Minute is a multiple of 15 and seconds (and milliseconds) are zero. */
function onSlotBoundary(instant: Date): boolean {
  return officeSecondsOfDay(instant) % SLOT_SECONDS === 0 && instant.getTime() % 1000 === 0;
}

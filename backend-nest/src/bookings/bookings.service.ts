import { Inject, Injectable } from '@nestjs/common';
import type Database from 'better-sqlite3';
import { CLOCK } from '../config/clock.provider.js';
import type { Clock } from '../config/clock.provider.js';
import { DATABASE } from '../db/database.provider.js';
import { officeDate, officeMidnight, officeWeekday, nextDay, formatOfficeDateTime } from '../common/office-time.js';
import {
  bookingNotAllowed,
  bookingNotFound,
  roomNotAvailable,
  roomNotFound,
  slotAlreadyBooked,
  tooLateToCancel,
} from '../common/problem.js';
import { RoomsRepository } from '../rooms/rooms.repository.js';
import type { Booking, BookingInput } from './bookings.dto.js';
import { toBooking } from './bookings.dto.js';
import { BookingRecord, BookingsRepository } from './bookings.repository.js';
import { canCancel, validateBookingWindow } from './booking-rules.js';

// Limits and messages are copied from backend/src/main/java/com/roombook/service/BookingService.java.
const TEXT_MAX = 100;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Injectable()
export class BookingsService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly rooms: RoomsRepository,
    @Inject(DATABASE) private readonly db: Database.Database,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Checks in the order of data-model.md: fields present (400), room exists (404), room active (422),
   * time rules (400), no overlap (409). Check and insert run in one immediate transaction.
   */
  create(input: BookingInput): Booking {
    return this.db.transaction((): Booking => {
      const title = requiredText(input.title, 'title');
      const organizer = requiredText(input.organizer, 'organizer');
      if (input.roomId === undefined || input.roomId === null) {
        throw bookingNotAllowed('roomId is required.');
      }
      if (input.start === undefined || input.start === null) {
        throw bookingNotAllowed('start is required.');
      }
      if (input.end === undefined || input.end === null) {
        throw bookingNotAllowed('end is required.');
      }
      const start = input.start;
      const end = input.end;

      const room = this.rooms.findById(input.roomId);
      if (room === undefined) {
        throw roomNotFound(input.roomId);
      }
      if (!room.active) {
        throw roomNotAvailable(room.name);
      }

      const now = this.clock.now();
      validateBookingWindow(start, end, now);

      const clashes = this.bookings.overlappingConfirmed(room.id, start, end);
      if (clashes.length > 0) {
        throw slotAlreadyBooked(clashDetail(clashes[0]));
      }

      const id = this.bookings.insert(room.id, title, organizer, key(organizer), start, end, now);
      return toBooking(this.require(id));
    }).immediate();
  }

  /** Confirmed bookings of the room whose start falls on the office-local day `date` (yyyy-MM-dd). */
  availability(roomId: number, date: string): Booking[] {
    if (this.rooms.findById(roomId) === undefined) {
      throw roomNotFound(roomId);
    }
    return this.bookings
      .confirmedStartingBetween(roomId, officeMidnight(date), officeMidnight(nextDay(date)))
      .map(toBooking);
  }

  /** Bookings of an organizer in any status, matched ignoring case and surrounding spaces. */
  byOrganizer(organizer: string): Booking[] {
    if (organizer.trim() === '') {
      throw bookingNotAllowed('organizer is required.');
    }
    return this.bookings.byOrganizerKey(key(organizer)).map(toBooking);
  }

  /** Soft cancellation: allowed while at least 60 minutes remain; idempotent for cancelled bookings. */
  cancel(id: number): Booking {
    return this.db.transaction((): Booking => {
      const booking = this.require(id);
      if (booking.status === 'CANCELLED') {
        return toBooking(booking);
      }
      if (!canCancel(booking.start, this.clock.now())) {
        throw tooLateToCancel();
      }
      this.bookings.markCancelled(id);
      return toBooking(this.require(id));
    }).immediate();
  }

  private require(id: number): BookingRecord {
    const booking = this.bookings.findById(id);
    if (booking === undefined) {
      throw bookingNotFound(id);
    }
    return booking;
  }
}

/** Required text: absent or blank is a booking rule failure. Binding has already made the value text or null. */
function requiredText(value: string | null | undefined, field: string): string {
  if (value === undefined || value === null) {
    throw bookingNotAllowed(`${field} is required.`);
  }
  const text = value.trim();
  if (text === '') {
    throw bookingNotAllowed(`${field} is required.`);
  }
  if (text.length > TEXT_MAX) {
    throw bookingNotAllowed(`${field} must be at most ${TEXT_MAX} characters.`);
  }
  return text;
}

/** Names the first clashing booking in office time, as the Spring service does. */
function clashDetail(first: BookingRecord): string {
  const hm = (instant: Date): string => formatOfficeDateTime(instant).slice(11, 16);
  const [, month, day] = officeDate(first.start).split('-').map(Number);
  const weekday = WEEKDAYS[officeWeekday(first.start) - 1];
  return `The room is already booked from ${hm(first.start)} to ${hm(first.end)} on ${weekday} ${day} ${MONTHS[month - 1]}.`;
}

function key(value: string): string {
  return value.trim().toLowerCase();
}

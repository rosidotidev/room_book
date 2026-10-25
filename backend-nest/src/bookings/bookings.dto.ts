import { formatOfficeDateTime } from '../common/office-time.js';
import { BookingRecord, BookingStatus } from './bookings.repository.js';

/** Booking body after binding; every field may be absent and is checked by BookingsService. */
export interface BookingInput {
  roomId?: number | null;
  title?: string | null;
  organizer?: string | null;
  start?: Date | null;
  end?: Date | null;
}

/** Booking as returned by the API: times carry the office-time offset (contract `Booking`). */
export interface Booking {
  id: number;
  roomId: number;
  title: string;
  organizer: string;
  start: string;
  end: string;
  status: BookingStatus;
  createdAt: string;
}

/** Future booking listed when a room is deactivated (contract `BookingSummary`). */
export interface BookingSummary {
  id: number;
  title: string;
  organizer: string;
  start: string;
  end: string;
}

export function toBooking(booking: BookingRecord): Booking {
  return {
    id: booking.id,
    roomId: booking.roomId,
    title: booking.title,
    organizer: booking.organizer,
    start: formatOfficeDateTime(booking.start),
    end: formatOfficeDateTime(booking.end),
    status: booking.status,
    createdAt: formatOfficeDateTime(booking.createdAt),
  };
}

export function toBookingSummary(booking: BookingRecord): BookingSummary {
  return {
    id: booking.id,
    title: booking.title,
    organizer: booking.organizer,
    start: formatOfficeDateTime(booking.start),
    end: formatOfficeDateTime(booking.end),
  };
}

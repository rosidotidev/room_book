import { BookingSummary, toBookingSummary } from '../bookings/bookings.dto.js';
import type { BookingRecord } from '../bookings/bookings.repository.js';
import type { RoomRecord } from './rooms.repository.js';

/** Room body as bound from the request; every field may be absent and is checked by RoomsService. */
export interface RoomInput {
  name?: string | null;
  capacity?: number | null;
  equipment?: (string | null)[] | null;
}

/** Activation body as bound from the request; `active` is null when it was absent or not a boolean. */
export interface ActiveChange {
  active?: boolean | null;
}

/** Room as returned by the API (contract `Room`). */
export interface Room {
  id: number;
  name: string;
  capacity: number;
  equipment: string[];
  active: boolean;
}

/** Result of a room activation change: the room and its future bookings (contract `RoomActivationResult`). */
export interface RoomActivationResult {
  room: Room;
  futureBookings: BookingSummary[];
}

export function toRoom(record: RoomRecord): Room {
  return {
    id: record.id,
    name: record.name,
    capacity: record.capacity,
    equipment: record.equipment,
    active: record.active,
  };
}

export function toRoomActivationResult(room: RoomRecord, futureBookings: BookingRecord[]): RoomActivationResult {
  return { room: toRoom(room), futureBookings: futureBookings.map(toBookingSummary) };
}

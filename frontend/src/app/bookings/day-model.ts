import { Booking, Room } from '../api';
import { DAY_END_MINUTES, DAY_START_MINUTES, SLOT_MINUTES, isWorkingDay, minutesOf, nowInOffice, officeParts, timeOf } from '../shared/office-time';
import { sameOrganizer } from '../shared/organizer-store';
import { DayColumn } from './bookings.facade';

/** 48 rows of 15 minutes from 08:00 to 20:00. */
export const ROWS = (DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_MINUTES;

/** Default length of a selection started by tapping a free row, in rows (one hour). */
export const DEFAULT_SELECTION_ROWS = 4;

export type CellState = 'free' | 'past';

export interface Cell {
  row: number;
  time: string;
  state: CellState;
}

export interface Block {
  booking: Booking;
  startRow: number;
  endRow: number; // exclusive
  start: string; // HH:mm
  end: string;
  own: boolean;
}

export interface ColumnModel {
  room: Room;
  blocks: Block[];
  cells: Cell[];
}

export function rowTime(row: number): string {
  return timeOf(DAY_START_MINUTES + row * SLOT_MINUTES);
}

function rowOf(time: string): number {
  return Math.round((minutesOf(time) - DAY_START_MINUTES) / SLOT_MINUTES);
}

/** Builds the rows of one room for a day: booked blocks, and the free or past cells between them. */
export function buildColumn(column: DayColumn, date: string, now: Date, owner: string): ColumnModel {
  const blocks: Block[] = column.bookings
    .map((booking) => {
      const start = officeParts(booking.start).time;
      const end = officeParts(booking.end).time;
      return {
        booking,
        start,
        end,
        startRow: Math.max(0, rowOf(start)),
        endRow: Math.min(ROWS, rowOf(end)),
        own: sameOrganizer(booking.organizer, owner),
      };
    })
    .sort((a, b) => a.startRow - b.startRow);

  const occupied = new Set<number>();
  for (const block of blocks) {
    for (let r = block.startRow; r < block.endRow; r++) {
      occupied.add(r);
    }
  }

  const cells: Cell[] = [];
  if (isWorkingDay(date)) {
    const today = nowInOffice(now);
    for (let row = 0; row < ROWS; row++) {
      if (occupied.has(row)) {
        continue;
      }
      const time = rowTime(row);
      const past = date < today.date || (date === today.date && minutesOf(time) < minutesOf(today.time));
      cells.push({ row, time, state: past ? 'past' : 'free' });
    }
  }
  return { room: column.room, blocks, cells };
}

/**
 * The period offered when a free row is tapped: from that row for one hour, never including an occupied row
 * and never beyond 20:00.
 */
export function freeSelection(model: ColumnModel, startRow: number): { start: string; end: string } {
  let endRow = Math.min(ROWS, startRow + DEFAULT_SELECTION_ROWS);
  for (const block of model.blocks) {
    if (block.startRow > startRow && block.startRow < endRow) {
      endRow = block.startRow;
    }
  }
  return { start: rowTime(startRow), end: timeOf(DAY_START_MINUTES + endRow * SLOT_MINUTES) };
}

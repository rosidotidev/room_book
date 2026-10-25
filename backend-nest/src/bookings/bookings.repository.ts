import { Inject, Injectable } from '@nestjs/common';
import type Database from 'better-sqlite3';
import { DATABASE } from '../db/database.provider.js';

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface BookingRecord {
  id: number;
  roomId: number;
  title: string;
  organizer: string;
  start: Date;
  end: Date;
  status: BookingStatus;
  createdAt: Date;
}

interface BookingRow {
  id: number;
  room_id: number;
  title: string;
  organizer: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  created_at: string;
}

const COLUMNS = 'id, room_id, title, organizer, start_at, end_at, status, created_at';

/**
 * Instants are stored as UTC text with whole seconds (yyyy-MM-ddTHH:mm:ssZ), so text order is
 * chronological order. This is the format the Spring service writes, so the copied database reads the same.
 */
@Injectable()
export class BookingsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database.Database) {}

  insert(
    roomId: number,
    title: string,
    organizer: string,
    organizerKey: string,
    start: Date,
    end: Date,
    createdAt: Date,
  ): number {
    const result = this.db
      .prepare(
        'INSERT INTO booking (room_id, title, organizer, organizer_key, start_at, end_at, status, created_at) ' +
          "VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)",
      )
      .run(roomId, title, organizer, organizerKey, utcText(start), utcText(end), utcText(createdAt));
    return Number(result.lastInsertRowid);
  }

  findById(id: number): BookingRecord | undefined {
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM booking WHERE id = ?`).get(id) as BookingRow | undefined;
    return row === undefined ? undefined : toRecord(row);
  }

  /** Confirmed bookings of the room that overlap [start, end): existing.start < end AND start < existing.end. */
  overlappingConfirmed(roomId: number, start: Date, end: Date): BookingRecord[] {
    return this.rows(
      `SELECT ${COLUMNS} FROM booking WHERE room_id = ? AND status = 'CONFIRMED' ` +
        'AND start_at < ? AND ? < end_at ORDER BY start_at',
      roomId,
      utcText(end),
      utcText(start),
    );
  }

  /** Confirmed bookings of the room whose start falls in [from, to), ordered by start. */
  confirmedStartingBetween(roomId: number, from: Date, to: Date): BookingRecord[] {
    return this.rows(
      `SELECT ${COLUMNS} FROM booking WHERE room_id = ? AND status = 'CONFIRMED' ` +
        'AND start_at >= ? AND start_at < ? ORDER BY start_at',
      roomId,
      utcText(from),
      utcText(to),
    );
  }

  /** Bookings of an organizer in any status, ordered by start then id. */
  byOrganizerKey(organizerKey: string): BookingRecord[] {
    return this.rows(`SELECT ${COLUMNS} FROM booking WHERE organizer_key = ? ORDER BY start_at, id`, organizerKey);
  }

  /** Confirmed bookings of the room that start after `now`, ordered by start. */
  futureConfirmed(roomId: number, now: Date): BookingRecord[] {
    return this.rows(
      `SELECT ${COLUMNS} FROM booking WHERE room_id = ? AND status = 'CONFIRMED' AND start_at > ? ORDER BY start_at`,
      roomId,
      utcText(now),
    );
  }

  markCancelled(id: number): void {
    this.db.prepare("UPDATE booking SET status = 'CANCELLED' WHERE id = ?").run(id);
  }

  private rows(sql: string, ...args: (number | string)[]): BookingRecord[] {
    return (this.db.prepare(sql).all(...args) as BookingRow[]).map(toRecord);
  }
}

/** UTC text with whole seconds and a Z suffix, for example 2026-10-20T07:00:00Z. */
export function utcText(instant: Date): string {
  return new Date(Math.floor(instant.getTime() / 1000) * 1000).toISOString().replace('.000Z', 'Z');
}

function toRecord(row: BookingRow): BookingRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    organizer: row.organizer,
    start: new Date(row.start_at),
    end: new Date(row.end_at),
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

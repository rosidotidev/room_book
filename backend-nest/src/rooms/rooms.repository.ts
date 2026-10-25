import { Inject, Injectable } from '@nestjs/common';
import type Database from 'better-sqlite3';
import { DATABASE } from '../db/database.provider.js';

/** An equipment item as typed (trimmed, first spelling kept) plus its lower-cased key. */
export interface EquipmentItem {
  text: string;
  key: string;
}

export interface RoomRecord {
  id: number;
  name: string;
  capacity: number;
  equipment: string[];
  active: boolean;
}

interface RoomRow {
  id: number;
  name: string;
  capacity: number;
  active: number;
}

/**
 * Room persistence over the room and room_equipment tables. Each method runs single statements; transactions
 * are opened by RoomsService (FR-023).
 */
@Injectable()
export class RoomsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database.Database) {}

  /** Rooms ordered by name key, optionally with at least `minCapacity` seats and the equipment key `equipmentKey`. */
  findAll(minCapacity: number | undefined, equipmentKey: string | undefined): RoomRecord[] {
    let sql = 'SELECT id, name, capacity, active FROM room WHERE 1 = 1';
    const args: (number | string)[] = [];
    if (minCapacity !== undefined) {
      sql += ' AND capacity >= ?';
      args.push(minCapacity);
    }
    if (equipmentKey !== undefined) {
      sql += ' AND EXISTS (SELECT 1 FROM room_equipment e WHERE e.room_id = room.id AND e.item_key = ?)';
      args.push(equipmentKey);
    }
    sql += ' ORDER BY name_key';

    const rows = this.db.prepare(sql).all(...args) as RoomRow[];
    const equipment = this.equipmentByRoom();
    return rows.map((row) => toRecord(row, equipment.get(row.id) ?? []));
  }

  findById(id: number): RoomRecord | undefined {
    const row = this.db.prepare('SELECT id, name, capacity, active FROM room WHERE id = ?').get(id) as
      | RoomRow
      | undefined;
    return row === undefined ? undefined : toRecord(row, this.equipmentOf(id));
  }

  /** True when another room (not `excludingId`) already uses this name key. */
  nameKeyTaken(nameKey: string, excludingId?: number): boolean {
    const excluded = excludingId ?? null;
    const row = this.db
      .prepare('SELECT count(*) AS total FROM room WHERE name_key = ? AND (? IS NULL OR id <> ?)')
      .get(nameKey, excluded, excluded) as { total: number };
    return row.total > 0;
  }

  insertRoom(name: string, nameKey: string, capacity: number): number {
    const result = this.db
      .prepare('INSERT INTO room (name, name_key, capacity, active) VALUES (?, ?, ?, 1)')
      .run(name, nameKey, capacity);
    return Number(result.lastInsertRowid);
  }

  updateRoom(id: number, name: string, nameKey: string, capacity: number): void {
    this.db.prepare('UPDATE room SET name = ?, name_key = ?, capacity = ? WHERE id = ?').run(name, nameKey, capacity, id);
  }

  setActive(id: number, active: boolean): void {
    this.db.prepare('UPDATE room SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  }

  /** Deletes the room's equipment rows and inserts the new list; called inside a RoomsService transaction. */
  replaceEquipment(roomId: number, equipment: EquipmentItem[]): void {
    this.db.prepare('DELETE FROM room_equipment WHERE room_id = ?').run(roomId);
    const insert = this.db.prepare('INSERT INTO room_equipment (room_id, item, item_key) VALUES (?, ?, ?)');
    for (const item of equipment) {
      insert.run(roomId, item.text, item.key);
    }
  }

  private equipmentOf(roomId: number): string[] {
    const rows = this.db.prepare('SELECT item FROM room_equipment WHERE room_id = ? ORDER BY rowid').all(roomId) as {
      item: string;
    }[];
    return rows.map((row) => row.item);
  }

  private equipmentByRoom(): Map<number, string[]> {
    const byRoom = new Map<number, string[]>();
    const rows = this.db.prepare('SELECT room_id, item FROM room_equipment ORDER BY rowid').all() as {
      room_id: number;
      item: string;
    }[];
    for (const row of rows) {
      const items = byRoom.get(row.room_id) ?? [];
      items.push(row.item);
      byRoom.set(row.room_id, items);
    }
    return byRoom;
  }
}

function toRecord(row: RoomRow, equipment: string[]): RoomRecord {
  return { id: row.id, name: row.name, capacity: row.capacity, equipment, active: row.active === 1 };
}

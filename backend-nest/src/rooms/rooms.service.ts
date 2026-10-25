import { Inject, Injectable } from '@nestjs/common';
import type Database from 'better-sqlite3';
import { BookingsRepository } from '../bookings/bookings.repository.js';
import { CLOCK } from '../config/clock.provider.js';
import type { Clock } from '../config/clock.provider.js';
import { DATABASE } from '../db/database.provider.js';
import { duplicateRoomName, invalidRoom, roomNotFound } from '../common/problem.js';
import type { ActiveChange, Room, RoomActivationResult, RoomInput } from './rooms.dto.js';
import { toRoom, toRoomActivationResult } from './rooms.dto.js';
import { RoomsRepository } from './rooms.repository.js';
import type { EquipmentItem, RoomRecord } from './rooms.repository.js';

// Limits and messages are copied from backend/src/main/java/com/roombook/service/RoomService.java.
const NAME_MAX = 100;
const CAPACITY_MAX = 1000;
const EQUIPMENT_MAX_ITEMS = 20;
const EQUIPMENT_ITEM_MAX = 50;

interface ValidRoom {
  name: string;
  nameKey: string;
  capacity: number;
  equipment: EquipmentItem[];
}

/** Room rules and the transactions of room writes (FR-023). */
@Injectable()
export class RoomsService {
  constructor(
    private readonly rooms: RoomsRepository,
    private readonly bookings: BookingsRepository,
    @Inject(DATABASE) private readonly db: Database.Database,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** All rooms, including inactive ones. */
  list(minCapacity: number | undefined, equipment: string | undefined): Room[] {
    if (minCapacity !== undefined && minCapacity < 1) {
      throw invalidRoom('minCapacity must be a whole number greater than zero.');
    }
    const equipmentKey = equipment === undefined || equipment.trim() === '' ? undefined : key(equipment);
    return this.rooms.findAll(minCapacity, equipmentKey).map(toRoom);
  }

  create(input: RoomInput): Room {
    const valid = validate(input);
    if (this.rooms.nameKeyTaken(valid.nameKey)) {
      throw duplicateRoomName(valid.name);
    }
    const id = this.insertOrTranslate(
      () =>
        this.db.transaction((): number => {
          const roomId = this.rooms.insertRoom(valid.name, valid.nameKey, valid.capacity);
          this.rooms.replaceEquipment(roomId, valid.equipment);
          return roomId;
        })(),
      valid.name,
    );
    return toRoom(this.require(id));
  }

  update(id: number, input: RoomInput): Room {
    this.require(id);
    const valid = validate(input);
    if (this.rooms.nameKeyTaken(valid.nameKey, id)) {
      throw duplicateRoomName(valid.name);
    }
    this.insertOrTranslate(
      () =>
        this.db.transaction((): void => {
          this.rooms.updateRoom(id, valid.name, valid.nameKey, valid.capacity);
          this.rooms.replaceEquipment(id, valid.equipment);
        })(),
      valid.name,
    );
    return toRoom(this.require(id));
  }

  /** Flips the active flag (idempotent); never deletes anything. */
  setActive(id: number, input: ActiveChange): RoomActivationResult {
    this.require(id);
    if (input.active === undefined || input.active === null) {
      throw invalidRoom('active is required and must be true or false.');
    }
    this.rooms.setActive(id, input.active);
    const room = this.require(id);
    return toRoomActivationResult(room, this.bookings.futureConfirmed(id, this.clock.now()));
  }

  private require(id: number): RoomRecord {
    const room = this.rooms.findById(id);
    if (room === undefined) {
      throw roomNotFound(id);
    }
    return room;
  }

  /** Runs a write; a UNIQUE violation on the room name becomes the documented 409. */
  private insertOrTranslate<T>(write: () => T, name: string): T {
    try {
      return write();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateRoomName(name);
      }
      throw error;
    }
  }
}

function validate(input: RoomInput): ValidRoom {
  const name = textOf(input.name);
  if (name === '') {
    throw invalidRoom('name is required.');
  }
  if (name.length > NAME_MAX) {
    throw invalidRoom(`name must be at most ${NAME_MAX} characters.`);
  }

  const capacity = input.capacity;
  if (capacity === undefined || capacity === null || capacity < 1) {
    throw invalidRoom('capacity must be a whole number greater than zero.');
  }
  if (capacity > CAPACITY_MAX) {
    throw invalidRoom(`capacity must be at most ${CAPACITY_MAX}.`);
  }

  return { name, nameKey: key(name), capacity, equipment: normaliseEquipment(input.equipment) };
}

/** Trims each item, rejects empty or over-long items, and keeps the first spelling of duplicates. */
function normaliseEquipment(raw: (string | null)[] | null | undefined): EquipmentItem[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (raw.length > EQUIPMENT_MAX_ITEMS) {
    throw invalidRoom(`equipment must have at most ${EQUIPMENT_MAX_ITEMS} items.`);
  }
  const unique = new Map<string, EquipmentItem>();
  for (const entry of raw) {
    const text = textOf(entry);
    if (text === '') {
      throw invalidRoom('equipment items must not be empty.');
    }
    if (text.length > EQUIPMENT_ITEM_MAX) {
      throw invalidRoom(`equipment items must be at most ${EQUIPMENT_ITEM_MAX} characters.`);
    }
    if (!unique.has(key(text))) {
      unique.set(key(text), { text, key: key(text) });
    }
  }
  return [...unique.values()];
}

/** Trimmed text; absent is empty. Binding has already made every value text or null. */
function textOf(value: string | null | undefined): string {
  return value === undefined || value === null ? '' : value.trim();
}

function key(value: string): string {
  return value.trim().toLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE';
}

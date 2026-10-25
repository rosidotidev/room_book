import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { openDatabase } from '../../src/db/database.provider.js';
import { runMigrations } from '../../src/db/migration-runner.js';
import { FixedClock } from '../support/fixed-clock.js';
import { createTestDatabase, TestDatabase } from '../support/test-db.js';

const CLOCK = new FixedClock('2026-10-24T10:00:00Z');

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function withRawDb<T>(file: string, work: (db: Database.Database) => T): T {
  const db = new Database(file);
  try {
    return work(db);
  } finally {
    db.close();
  }
}

function tableExists(db: Database.Database, name: string): boolean {
  return db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== undefined;
}

describe('startup gate: database copy and migration runner', () => {
  let fixture: TestDatabase;

  beforeEach(() => {
    fixture = createTestDatabase();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it('refuses a missing database file and does not create it', () => {
    const missing = path.join(os.tmpdir(), `roombook-missing-${process.pid}-${Date.now()}.db`);

    expect(() => openDatabase(missing)).toThrow(missing);
    expect(() => openDatabase(missing)).toThrow('cp backend/data/roombook.db backend-nest/data/roombook.db');
    expect(fs.existsSync(missing)).toBe(false);
  });

  it('accepts a copy whose versions 1-4 are recorded as successful, and leaves the file bytes unchanged', () => {
    const before = sha256(fixture.path);

    const db = openDatabase(fixture.path);
    try {
      expect(() => runMigrations(db, { clock: CLOCK })).not.toThrow();
    } finally {
      db.close();
    }

    expect(sha256(fixture.path)).toBe(before);
  });

  it('refuses a copy in which version 3 is not recorded', () => {
    withRawDb(fixture.path, (db) => db.prepare("DELETE FROM flyway_schema_history WHERE version = '3'").run());
    const before = sha256(fixture.path);

    const db = openDatabase(fixture.path);
    try {
      expect(() => runMigrations(db, { clock: CLOCK })).toThrow(/version 3/);
    } finally {
      db.close();
    }

    expect(sha256(fixture.path)).toBe(before);
  });

  it('refuses a copy in which version 4 is recorded with success = 0', () => {
    withRawDb(fixture.path, (db) => db.prepare("UPDATE flyway_schema_history SET success = 0 WHERE version = '4'").run());
    const before = sha256(fixture.path);

    const db = openDatabase(fixture.path);
    try {
      expect(() => runMigrations(db, { clock: CLOCK })).toThrow(/version 4/);
    } finally {
      db.close();
    }

    expect(sha256(fixture.path)).toBe(before);
  });

  it('creates no schema_migrations table when no migration beyond V4 is pending', () => {
    const db = openDatabase(fixture.path);
    try {
      const result = runMigrations(db, { clock: CLOCK });

      expect(result.applied).toEqual([]);
      expect(tableExists(db, 'schema_migrations')).toBe(false);
    } finally {
      db.close();
    }
  });

  it('applies a pending V5 once, records it, and leaves flyway_schema_history unchanged', () => {
    const migrationsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roombook-v5-'));
    fs.writeFileSync(path.join(migrationsDir, 'V5__add_note.sql'), 'CREATE TABLE note (id INTEGER PRIMARY KEY);\n');
    const historyBefore = withRawDb(fixture.path, (db) =>
      db.prepare('SELECT * FROM flyway_schema_history ORDER BY installed_rank').all(),
    );

    try {
      const first = openDatabase(fixture.path);
      try {
        expect(runMigrations(first, { clock: CLOCK, migrationsDir }).applied).toEqual([5]);
      } finally {
        first.close();
      }

      const second = openDatabase(fixture.path);
      try {
        expect(runMigrations(second, { clock: CLOCK, migrationsDir }).applied).toEqual([]);
        expect(tableExists(second, 'note')).toBe(true);
        const recorded = second.prepare('SELECT version, description FROM schema_migrations').all();
        expect(recorded).toEqual([{ version: 5, description: 'add note' }]);
      } finally {
        second.close();
      }

      const historyAfter = withRawDb(fixture.path, (db) =>
        db.prepare('SELECT * FROM flyway_schema_history ORDER BY installed_rank').all(),
      );
      expect(historyAfter).toEqual(historyBefore);
    } finally {
      fs.rmSync(migrationsDir, { recursive: true, force: true });
    }
  });
});

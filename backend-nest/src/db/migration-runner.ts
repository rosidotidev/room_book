import type Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Clock, SystemClock } from '../config/clock.provider.js';

/** Flyway baseline the copied database must carry (V1–V4). */
const BASELINE_VERSIONS = [1, 2, 3, 4];
const LAST_BASELINE_VERSION = Math.max(...BASELINE_VERSIONS);

/** Source of V5+ files; resolved from the package root so it works from src/ and dist/. */
export const DEFAULT_MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'db',
  'migrations',
);

const MIGRATION_FILE = /^V(\d+)__(.+)\.sql$/;

export class MigrationRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationRefusedError';
  }
}

export interface MigrationOptions {
  migrationsDir?: string;
  clock?: Clock;
}

export interface MigrationResult {
  applied: number[];
}

/**
 * Refuses unless the Flyway baseline (V1–V4, success = 1) is recorded, then applies
 * any pending migration with version greater than 4. Baseline rows are only read.
 */
export function runMigrations(db: Database.Database, options: MigrationOptions = {}): MigrationResult {
  verifyBaseline(db);

  const migrationsDir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
  const pending = pendingMigrations(db, migrationsDir);
  if (pending.length === 0) {
    return { applied: [] };
  }

  const clock = options.clock ?? new SystemClock();
  for (const migration of pending) {
    const sql = fs.readFileSync(migration.file, 'utf8');
    const apply = db.transaction(() => {
      db.exec(
        'CREATE TABLE IF NOT EXISTS schema_migrations (' +
          'version INTEGER PRIMARY KEY, description TEXT NOT NULL, applied_at TEXT NOT NULL)',
      );
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.description,
        clock.now().toISOString(),
      );
    });
    apply.immediate();
  }
  return { applied: pending.map((migration) => migration.version) };
}

function verifyBaseline(db: Database.Database): void {
  if (!tableExists(db, 'flyway_schema_history')) {
    throw new MigrationRefusedError(
      'flyway_schema_history is missing: the database is not a copy of backend/data/roombook.db (baseline versions 1-4 expected).',
    );
  }
  for (const version of BASELINE_VERSIONS) {
    const rows = db
      .prepare('SELECT success FROM flyway_schema_history WHERE version = ?')
      .all(String(version)) as { success: number }[];
    if (rows.length === 0) {
      throw new MigrationRefusedError(`Baseline version ${version} is not recorded in flyway_schema_history.`);
    }
    if (!rows.some((row) => row.success === 1)) {
      throw new MigrationRefusedError(
        `Baseline version ${version} is recorded in flyway_schema_history but not successful (success = 0).`,
      );
    }
  }
}

interface MigrationFile {
  version: number;
  description: string;
  file: string;
}

function pendingMigrations(db: Database.Database, migrationsDir: string): MigrationFile[] {
  const recorded = recordedVersions(db);
  return fs
    .readdirSync(migrationsDir)
    .flatMap((name): MigrationFile[] => {
      const match = MIGRATION_FILE.exec(name);
      if (match === null) {
        return [];
      }
      const version = Number(match[1]);
      if (version <= LAST_BASELINE_VERSION || recorded.has(version)) {
        return [];
      }
      return [{ version, description: match[2].replace(/_/g, ' '), file: path.join(migrationsDir, name) }];
    })
    .sort((a, b) => a.version - b.version);
}

function recordedVersions(db: Database.Database): Set<number> {
  if (!tableExists(db, 'schema_migrations')) {
    return new Set();
  }
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[];
  return new Set(rows.map((row) => row.version));
}

function tableExists(db: Database.Database, name: string): boolean {
  return db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== undefined;
}

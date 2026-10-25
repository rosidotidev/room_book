import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

/** Source of the copied V1–V4 files (the runner reads the same directory). */
export const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'db',
  'migrations',
);

const BASELINE_VERSIONS = [1, 2, 3, 4];

const FLYWAY_HISTORY_DDL = `
CREATE TABLE "flyway_schema_history" (
    "installed_rank" INT NOT NULL PRIMARY KEY,
    "version" VARCHAR(50),
    "description" VARCHAR(200) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "script" VARCHAR(1000) NOT NULL,
    "checksum" INT,
    "installed_by" VARCHAR(100) NOT NULL,
    "installed_on" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now')),
    "execution_time" INT NOT NULL,
    "success" BOOLEAN NOT NULL
)`;

export interface TestDatabase {
  path: string;
  cleanup: () => void;
}

/**
 * Test-only bootstrap: a temporary database with V1–V4 applied and the Flyway
 * history rows a real copy would carry. The running service never calls this.
 */
export function createTestDatabase(): TestDatabase {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roombook-test-'));
  const dbPath = path.join(dir, 'roombook.db');
  const db = new Database(dbPath);
  try {
    db.exec(FLYWAY_HISTORY_DDL);
    const insertHistory = db.prepare(`
      INSERT INTO flyway_schema_history
        (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
      VALUES (?, ?, ?, 'SQL', ?, NULL, '', 0, 1)`);
    for (const version of BASELINE_VERSIONS) {
      const script = fs.readdirSync(MIGRATIONS_DIR).find((name) => name.startsWith(`V${version}__`));
      if (script === undefined) {
        throw new Error(`test bootstrap: no V${version} migration in ${MIGRATIONS_DIR}`);
      }
      db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, script), 'utf8'));
      const description = script.replace(/^V\d+__/, '').replace(/\.sql$/, '').replace(/_/g, ' ');
      insertHistory.run(version, String(version), description, script);
    }
  } finally {
    db.close();
  }
  return {
    path: dbPath,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

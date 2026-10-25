import Database from 'better-sqlite3';
import * as fs from 'fs';

/** DI token for the open database handle. */
export const DATABASE = 'DATABASE';

/**
 * Opens an existing database file. Never creates one: a missing file is an error
 * that names the path and the copy command for the local database copy.
 */
export function openDatabase(dbPath: string): Database.Database {
  if (!fs.existsSync(dbPath)) {
    throw new Error(
      `Database file not found: ${dbPath}\n` +
        'Create the local copy first: cp backend/data/roombook.db backend-nest/data/roombook.db',
    );
  }
  const db = new Database(dbPath, { fileMustExist: true });
  db.pragma('foreign_keys = ON');
  return db;
}

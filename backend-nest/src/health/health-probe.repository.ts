import { Inject, Injectable } from '@nestjs/common';
import type Database from 'better-sqlite3';
import { DATABASE } from '../db/database.provider.js';

/**
 * Single statements on the health_probe table. HealthService runs them inside one transaction (FR-023);
 * this repository never opens a transaction.
 */
@Injectable()
export class HealthProbeRepository {
  constructor(@Inject(DATABASE) private readonly db: Database.Database) {}

  insert(value: string): void {
    this.db.prepare('INSERT INTO health_probe (id, checked_at) VALUES (1, ?)').run(value);
  }

  /** The stored value, or undefined when the row is absent. */
  read(): string | undefined {
    const row = this.db.prepare('SELECT checked_at FROM health_probe WHERE id = 1').get() as
      | { checked_at: string }
      | undefined;
    return row?.checked_at;
  }

  delete(): void {
    this.db.prepare('DELETE FROM health_probe WHERE id = 1').run();
  }
}

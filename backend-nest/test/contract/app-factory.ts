import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type Database from 'better-sqlite3';
import { AppModule } from '../../src/app.module.js';
import { ProblemFilter } from '../../src/common/problem.filter.js';
import { AppConfig } from '../../src/config/config.js';
import { openDatabase } from '../../src/db/database.provider.js';
import { FixedClock } from '../support/fixed-clock.js';
import { createTestDatabase } from '../support/test-db.js';

/** Tuesday 11:00 office time (CEST). Bookings in the contract tests are placed relative to this instant. */
export const FIXED_NOW = '2026-10-20T09:00:00Z';

export interface TestApp {
  app: INestApplication;
  clock: FixedClock;
  database: Database.Database;
  close: () => Promise<void>;
}

/**
 * Builds the Nest application through Test.createTestingModule, with the fixed clock and a fresh
 * temporary copy of the V1–V4 database, and the same global filter as main.ts. Call once per test
 * file. The database is never the real backend/ file.
 */
export async function createTestApp(instant: string = FIXED_NOW): Promise<TestApp> {
  const fixture = createTestDatabase();
  const clock = new FixedClock(instant);
  const database = openDatabase(fixture.path);
  const config: AppConfig = {
    dbPath: fixture.path,
    officeZone: 'Europe/Rome',
    port: 0,
    clockFixedAt: instant,
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register({ config, clock, db: database })],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalFilters(new ProblemFilter());
  await app.init();

  return {
    app,
    clock,
    database,
    close: async () => {
      await app.close();
      if (database.open) {
        database.close();
      }
      fixture.cleanup();
    },
  };
}

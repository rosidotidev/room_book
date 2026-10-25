import { Inject, Injectable, Logger } from '@nestjs/common';
import type Database from 'better-sqlite3';
import { CLOCK } from '../config/clock.provider.js';
import type { Clock } from '../config/clock.provider.js';
import { DATABASE } from '../db/database.provider.js';
import type { HealthReport, HealthStatus } from './health.dto.js';
import { HealthProbeRepository } from './health-probe.repository.js';

/**
 * Spring serializes the instant with java.time's ISO_INSTANT (R-005, confirmed by the parity replay): UTC with a
 * Z suffix, and a fraction only when it is not zero (3, 6 or 9 digits). A JavaScript Date has milliseconds, so the
 * fraction is 3 digits or absent.
 */
export function formatInstant(instant: Date): string {
  const iso = instant.toISOString();
  return instant.getUTCMilliseconds() === 0 ? iso.replace(/\.000Z$/, 'Z') : iso;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly repository: HealthProbeRepository,
    @Inject(DATABASE) private readonly db: Database.Database,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Both fields are UP when the probe round trip succeeds, otherwise both are DOWN. */
  check(): HealthReport {
    const now = this.clock.now();
    let database: HealthStatus;
    try {
      this.roundTrip(now);
      database = 'UP';
    } catch (error) {
      this.logger.warn(`Database health probe failed: ${error instanceof Error ? error.message : String(error)}`);
      database = 'DOWN';
    }
    return { status: database, database, time: formatInstant(now) };
  }

  /** Writes a row, reads it back and deletes it in one transaction; throws if any step fails (FR-023). */
  private roundTrip(at: Date): void {
    const value = at.toISOString();
    this.db.transaction(() => {
      this.repository.insert(value);
      if (this.repository.read() !== value) {
        throw new Error('health probe read back a different value');
      }
      this.repository.delete();
    })();
  }
}

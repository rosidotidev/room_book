import type { AppConfig } from './config.js';

/** DI token for the {@link Clock} used by every time-dependent rule (constitution IV). */
export const CLOCK = 'CLOCK';

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  private instant: Date;

  constructor(instant: Date | string) {
    this.instant = new Date(instant);
  }

  now(): Date {
    return new Date(this.instant.getTime());
  }

  set(instant: Date | string): void {
    this.instant = new Date(instant);
  }
}

/** FixedClock only when ROOMBOOK_CLOCK_FIXED_AT is set (parity runs); otherwise the system clock. */
export function createClock(config: Pick<AppConfig, 'clockFixedAt'>): Clock {
  return config.clockFixedAt !== undefined ? new FixedClock(config.clockFixedAt) : new SystemClock();
}

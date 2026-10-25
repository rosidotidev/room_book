import * as path from 'path';
import { fileURLToPath } from 'url';

/** DI token for the resolved {@link AppConfig}. */
export const CONFIG = 'CONFIG';

/** backend-nest/ package root; the same relative depth from src/config and dist/config. */
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface AppConfig {
  dbPath: string;
  officeZone: string;
  port: number;
  clockFixedAt?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const fixedAt = env.ROOMBOOK_CLOCK_FIXED_AT?.trim() || undefined;
  if (fixedAt !== undefined && Number.isNaN(Date.parse(fixedAt))) {
    throw new Error(`ROOMBOOK_CLOCK_FIXED_AT is not a valid instant: "${fixedAt}"`);
  }
  return {
    dbPath: path.resolve(env.ROOMBOOK_DB_PATH ?? path.join(PACKAGE_ROOT, 'data', 'roombook.db')),
    officeZone: env.ROOMBOOK_OFFICE_ZONE ?? 'Europe/Rome',
    port: parsePort(env.PORT ?? '8080'),
    clockFixedAt: fixedAt,
  };
}

function parsePort(raw: string): number {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got "${raw}"`);
  }
  return port;
}
